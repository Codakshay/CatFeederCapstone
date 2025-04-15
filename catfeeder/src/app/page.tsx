import Controls from "@/components/controlsTest";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-orange-50">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <h1 className="text-5xl font-extrabold mb-2"> Claude Feeder</h1>
          <p className="text-xl">Automated feeding made easy</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-10">
        <Controls />
      </main>
    </div>
  );
}
