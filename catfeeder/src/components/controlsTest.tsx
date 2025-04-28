"use client";

import { time } from "console";
import { useState, useEffect, useRef } from "react";

// Define a feeder interface and list of feeders.
interface Feeder {
  id: string;
  name: string;
  baseUrl: string;
}

type feedEntry = {
  timestamp:string;
  feeder:string;
};

const feeders: Feeder[] = [
  { id: "feeder1", name: "Feeder 1", baseUrl: "http://172.16.11.163:3000" }, //"http://127.0.1.1:3000"
  { id: "feeder2", name: "Feeder 2", baseUrl: "http://192.168.0.32:3000" },
];

// Helper: Convert 24-hour time (e.g. "14:15") to 12-hour time with AM/PM.
function convertTime24to12(time24: string): string {
  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

// Helper: Convert dropdown values (hour, minute, period) to 24-hour formatted time "HH:MM"
function convertTo24Hour(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "PM" && h !== 12) {
    h += 12;
  } else if (period === "AM" && h === 12) {
    h = 0;
  }
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

export default function Controls() {
  // Feeder selection state.
  const [selectedFeeder, setSelectedFeeder] = useState<Feeder>(feeders[0]);
  const [brightness, setBrightness] = useState(0);
  const [feedingHistory, setFeedingHistory] = useState<feedEntry[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([])


  // Daily schedule: keys are "HH:MM" (24-hour format), one per hour.
  const [hourSchedule, setHourSchedule] = useState<Record<string, boolean>>(() => {
    const schedule: Record<string, boolean> = {};
    for (let i = 0; i < 24; i++) {
      const hourKey = i.toString().padStart(2, "0") + ":00";
      schedule[hourKey] = false;
    }
    return schedule;
  });
  // Custom times stored as strings in "HH:MM" format.
  const [customTimes, setCustomTimes] = useState<string[]>([]);
  // Dropdown states for custom time.
  const [customHour, setCustomHour] = useState("12");
  const [customMinute, setCustomMinute] = useState("00");
  const [customPeriod, setCustomPeriod] = useState("AM");

  // Update the motor speed via the selected feeder's API.
  const updateMotorSpeed = async (value: number) => {
    setBrightness(value);
    try {
      await fetch(`${selectedFeeder.baseUrl}/api/py/brightness/${value}`, { method: "PUT" });
    } catch (error) {
      console.error("Failed to update motor speed:", error);
    }
  };

  async function appendFeedingHistory(timestamp: string, feeder: string) {
    const response = await fetch('/api/feedhistory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({timestamp, feeder })
    });
  
    const data = await response.json();
    console.log(data);
  }

  async function getFeedingHistory() {
    const response = await fetch('/api/feedhistory');
    const data = await response.json();
    // sort list so latest is on top
    data.items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setFeedingHistory(data.items); // [{ timestamp, feeder }, ...]
  }
  
  // Saves list of scheduled hours and custom times
  async function saveSchedule(hourSchedule: string[], customSchedule: string[]) {
    const response = await fetch('/api/feedschedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"hourSchedule": hourSchedule, "customSchedule": customSchedule })
    });
  
    const data = await response.json();
    console.log(data);
  }

  async function loadSchedule() {
    const response = await fetch('/api/feedschedule');
    const data = await response.json()
    // response data should look like
    // {
    //   hourSchedule: string[];
    //   customSchedule: string[];
    //   savedAt: string | null;
    // }
    setHourSchedule((prev) => {
      const newSchedule: Record<string,boolean> = {};
      for (const time of Object.keys(prev)) {
        newSchedule[time] = data.hourSchedule.includes(time);
      }
      return newSchedule;
    });
    setCustomTimes(data.customSchedule);
    setScheduleLoaded(true);
    
  }
  // Log the dispensing action.
  const logDispense = () => {
    const timestamp = new Date().toLocaleTimeString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
     const newEntry = {timestamp:new Date().toISOString(), feeder:`${selectedFeeder.name}`};
     setFeedingHistory(prev => [newEntry, ...prev]);
    appendFeedingHistory(newEntry.timestamp,newEntry.feeder);
    //appendFeedingHistory(new Date().toISOString(),`${selectedFeeder.name}`);
  };
  
  // Fetch history items when component loads
  useEffect(() => {
    getFeedingHistory();
    loadSchedule();
  }, []);
  
  useEffect(() => {
    if (scheduleLoaded) {
      console.log("Finished loading schedule stuff")
      scheduleDispenses();
    }
  }, [scheduleLoaded]);

  // Dispense: Turn motor on then off after 1.5 seconds.
  const dispense = () => {
    updateMotorSpeed(100);
    logDispense();
    setTimeout(() => {
      updateMotorSpeed(0);
    }, 1000);
  };

  // Compute delay (in ms) until next occurrence of a given time ("HH:MM").
  const computeDelay = (timeStr: string): number => {
    const [hour, minute] = timeStr.split(":").map(Number);
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    return scheduled.getTime() - now.getTime();
  };

  // Update Schedule
  const updateSchedule = () => {
    const hoursToSchedule = [
      ...Object.entries(hourSchedule)
        .filter(([time,active]) => active)
        .map(([time]) => time)
    ];
    saveSchedule(hoursToSchedule, customTimes);
    scheduleDispenses();
  }

  // Schedule dispenses for all selected times.
  const scheduleDispenses = () => {
    const timesToSchedule = [
      ...Object.entries(hourSchedule)
        .filter(([time, active]) => active)
        .map(([time]) => time),
      ...customTimes,
    ];

    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];


    timesToSchedule.forEach((timeStr) => {
      const delay = computeDelay(timeStr);
      console.log(`Scheduling dispense at ${timeStr} in ${delay} ms`);
      const id = setTimeout(() => {
        console.log(`Dispensing at ${timeStr}`);
        dispense();
      }, delay);
      timeoutIdsRef.current.push(id);
    });
    //alert("Dispense schedule updated.");
  };

  // Toggle daily schedule checkbox.
  const toggleHour = (timeStr: string) => {
    setHourSchedule((prev) => ({ ...prev, [timeStr]: !prev[timeStr] }));
  };

  // Add custom time using dropdown values.
  const addCustomTime = () => {
    const time24 = convertTo24Hour(customHour, customMinute, customPeriod);
    if (customTimes.includes(time24)) {
      alert("This time has already been added.");
      return;
    }
    setCustomTimes((prev) => [...prev, time24]);
  };

  async function clearFeedingHistory() {
    const response = await fetch('/api/feedhistory', {
      method: 'DELETE',
    });
  
    const data = await response.json();
    console.log(data);
  }

  // Clear the feeding history.
  const clearHistory = () => {
    setFeedingHistory([]);
    clearFeedingHistory();
  };

  // Options for dropdowns.
  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minuteOptions = ["00", "15", "30", "45"];
  const periodOptions = ["AM", "PM"];

  // State for sound management.
  interface SoundResponse {
    sounds?: string[];
    message?: string;
    error?: string;
  }

  const [isLoadingSounds, setIsLoadingSounds] = useState(true);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<string>("");
  const [soundOptions, setSoundOptions] = useState<string[]>([]);

  // Fetch available sounds.
  useEffect(() => {
    const fetchSounds = async () => {
      setIsLoadingSounds(true);
      setSoundError(null);

      try {
        const response = await fetch("http://172.16.11.163:5001/api/get-sounds"); //Change IP here
        const data: SoundResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch sounds");
        }

        if (data.sounds && data.sounds.length > 0) {
          setSoundOptions(data.sounds);
          setSelectedSound(data.sounds[0]); // Auto-select first sound.
        } else {
          setSoundError("No sounds available");
        }
      } catch (error) {
        console.error("Error fetching sounds:", error);
        setSoundError(error instanceof Error ? error.message : "Failed to load sounds");
      } finally {
        setIsLoadingSounds(false);
      }
    };

    fetchSounds();
  }, []);

  // Play selected sound.
  const playSound = async () => {
    if (!selectedSound) {
      setSoundError("Please select a sound first");
      return;
    }
  
    setPlayStatus(null);
    setSoundError(null);
  
    try {
      // Ensure that the sound name is URL-encoded
      const response = await fetch(
        `http://172.16.11.163:5001/api/play-sound/${encodeURIComponent(selectedSound)}`, //Change IP here
        { method: "POST" }
      );
  
      const data: SoundResponse = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Failed to play sound");
      }
  
      setPlayStatus(data.message || "Sound played successfully");
      console.log("Sound played:", data.message);
    } catch (error) {
      console.error("Error playing sound:", error);
      setSoundError(error instanceof Error ? error.message : "Failed to play sound");
      setPlayStatus(null);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-orange-50 rounded-lg shadow-md border border-orange-200">
      {/* Feeder Selection */}
      <div className="mb-4">
        <label className="block text-orange-700 font-semibold mb-1">
          Select Feeder:
        </label>
        <select
          value={selectedFeeder.id}
          onChange={(e) => {
            const feeder = feeders.find((f) => f.id === e.target.value);
            if (feeder) setSelectedFeeder(feeder);
          }}
          className="w-full rounded border border-orange-400 px-2 py-1 text-orange-800"
        >
          {feeders.map((feeder) => (
            <option key={feeder.id} value={feeder.id}>
              {feeder.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column: Feeding Controls */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-orange-700 mb-4 text-center">
            Cat Feeder Motor Control
          </h3>

          {/* Immediate Dispense */}
          <div className="mb-6 flex justify-center">
            <button
              onClick={dispense}
              className="px-6 py-3 bg-orange-700 hover:bg-orange-800 text-white font-medium rounded-full shadow"
            >
              Dispense Now
            </button>
          </div>

          {/* Daily Schedule Checkboxes (displayed in 12-hour format) */}
          <div className="mb-6">
            <h4 className="font-semibold text-orange-700 mb-2">Daily Schedule</h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(hourSchedule).map((timeStr) => (
                <label key={timeStr} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={hourSchedule[timeStr]}
                    onChange={() => toggleHour(timeStr)}
                    className="h-4 w-4 text-orange-700 border-orange-400 rounded"
                  />
                  <span className="text-sm text-orange-800">
                    {convertTime24to12(timeStr)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Times using dropdowns */}
          <div className="mb-6">
            <h4 className="font-semibold text-orange-700 mb-2">Add Custom Time</h4>
            <div className="flex items-center gap-2">
              <select
                value={customHour}
                onChange={(e) => setCustomHour(e.target.value)}
                className="rounded border border-orange-400 px-2 py-1 text-orange-800"
              >
                {hourOptions.map((hr) => (
                  <option key={hr} value={hr}>
                    {hr}
                  </option>
                ))}
              </select>
              <span className="text-orange-800">:</span>
              <select
                value={customMinute}
                onChange={(e) => setCustomMinute(e.target.value)}
                className="rounded border border-orange-400 px-2 py-1 text-orange-800"
              >
                {minuteOptions.map((min) => (
                  <option key={min} value={min}>
                    {min}
                  </option>
                ))}
              </select>
              <select
                value={customPeriod}
                onChange={(e) => setCustomPeriod(e.target.value)}
                className="rounded border border-orange-400 px-2 py-1 text-orange-800"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={addCustomTime}
                className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-full shadow"
              >
                Add Time
              </button>
            </div>
            {customTimes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {customTimes.map((time, index) => (
                  <li key={index} className="text-sm text-orange-800">
                    {convertTime24to12(time)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Update Schedule */}
          <div className="mb-6">
            <button
              onClick={updateSchedule}
              className="w-full px-6 py-3 bg-orange-700 hover:bg-orange-800 text-white font-medium rounded-full shadow"
            >
              Update Dispense Schedule
            </button>
          </div>

          {/* Feeding History */}
          <div className="mb-6">
            <h4 className="font-semibold text-orange-700 mb-2">Feeding History</h4>
            {feedingHistory.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto space-y-1 border border-orange-200 p-2 rounded">
                {feedingHistory.map((entry, index) => (
                  <li key={index} className="text-sm text-orange-800">
                    <div>{new Date(entry.timestamp).toLocaleString("en-US", {dateStyle: "short", timeStyle: "short"}).replace(",", "")}
                    &nbsp;{entry.feeder}</div>

                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-orange-600">No feeds recorded yet.</p>
            )}
            {feedingHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-full shadow"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="text-center text-sm text-orange-800 font-medium">
            Current Motor Speed: {brightness}%
          </div>
        </div>

        {/* Right Column: Camera Preview & Sound Selection */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-orange-700 mb-4 text-center">
            Camera Preview
          </h3>
          <div className="w-full h-80 bg-orange-200 rounded-lg flex items-center justify-center border border-orange-400">
            <img
              src="http://172.16.11.163:8080/mjpeg" //Change IP here 
              alt="Live Camera Feed"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* Sound Selection Below Camera */}
          <div className="mt-4">
            <h4 className="font-semibold text-orange-700 mb-2 text-center">Play Sound</h4>
            {isLoadingSounds ? (
              <div className="text-center text-orange-600">Loading sounds...</div>
            ) : soundError ? (
              <div className="text-center text-red-500">{soundError}</div>
            ) : soundOptions.length === 0 ? (
              <div className="text-center text-orange-600">No sounds available</div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <select
                    value={selectedSound}
                    onChange={(e) => setSelectedSound(e.target.value)}
                    className="rounded border border-orange-400 px-2 py-1 text-orange-800"
                  >
                    {soundOptions.map((sound, index) => (
                      <option key={index} value={sound}>
                        {sound}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={playSound}
                    disabled={!selectedSound || isLoadingSounds}
                    className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-full shadow disabled:opacity-50"
                  >
                    Play
                  </button>
                </div>
                {playStatus && (
                  <div className="text-green-600 text-sm mt-1">{playStatus}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
