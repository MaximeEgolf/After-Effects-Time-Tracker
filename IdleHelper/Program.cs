using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

internal static class Program
{
    [StructLayout(LayoutKind.Sequential)]
    private struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    private static int Main(string[] args)
    {
        if (args.Length != 1)
        {
            Console.Error.WriteLine("Expected the path to the idle-time output file.");
            return 2;
        }

        using var mutex = new Mutex(false, @"Local\AETT-IdleHelper");
        if (!mutex.WaitOne(0))
        {
            return 0;
        }

        var outputPath = Path.GetFullPath(args[0]);
        var outputDirectory = Path.GetDirectoryName(outputPath);
        if (string.IsNullOrEmpty(outputDirectory))
        {
            Console.Error.WriteLine("Invalid idle-time output path.");
            return 2;
        }
        Directory.CreateDirectory(outputDirectory);

        while (IsAfterEffectsRunning())
        {
            var info = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>() };
            if (!GetLastInputInfo(ref info))
            {
                Console.Error.WriteLine("GetLastInputInfo failed: " + Marshal.GetLastWin32Error());
                return 1;
            }

            var now = unchecked((uint)Environment.TickCount);
            var idleSeconds = unchecked(now - info.dwTime) / 1000.0;
            WriteIdleSeconds(outputPath, idleSeconds);
            Thread.Sleep(1000);
        }

        return 0;
    }

    private static bool IsAfterEffectsRunning()
    {
        var processes = Process.GetProcessesByName("AfterFX");
        var isRunning = processes.Length > 0;
        foreach (var process in processes)
        {
            process.Dispose();
        }
        return isRunning;
    }

    private static void WriteIdleSeconds(string outputPath, double idleSeconds)
    {
        var temporaryPath = outputPath + ".tmp";
        File.WriteAllText(temporaryPath, idleSeconds.ToString(CultureInfo.InvariantCulture));
        File.Move(temporaryPath, outputPath, true);
    }
}
