import { NextResponse, type NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function PUT(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const brightness = context.params.brightness;
  const brightnessValue = parseInt(brightness, 10);

  if (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 100) {
    return NextResponse.json({ message: 'Invalid brightness value' }, { status: 400 });
  }

  const scriptPath = '/home/CatFeeder/gpio/main.py';
  const pythonPath = '/usr/bin/python3';

  return await new Promise((resolve) => {
    const pyProcess = spawn(pythonPath, [scriptPath, brightnessValue.toString(), '0.01']);

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ message: 'Motor command executed', output }));
      } else {
        resolve(
          NextResponse.json(
            { message: 'Motor command failed', code, errorOutput },
            { status: 500 }
          )
        );
      }
    });
  });
}
