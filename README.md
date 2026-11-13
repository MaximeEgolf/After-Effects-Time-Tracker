# Time Tracker — prototype 0.1

Target: Windows + After Effects 26.0.

## Tracking behavior and limitations

- Open the panel once per After Effects session to start tracking. You can close it afterward; the timer runs in After Effects' background ExtendScript engine.
- Tracking stops when After Effects exits. Reopen the panel after restarting After Effects.
- The timer counts while a saved `.aep` project is open and Windows idle time is below five minutes, even if another application is foreground.
- Unsaved projects are not tracked yet because they have no stable file path.
- This is an initial development build; test it on copies of projects first.
- After Effects checks the project and idle state every two seconds and saves totals every ten seconds.

## 1. Install the CEP panel

Copy this extension folder to a subfolder under:

`%APPDATA%\Adobe\CEP\extensions\<extension-folder>`

Create the `extensions` folder if it does not exist. The folder name is not
used as the extension ID; keep the contents together when renaming or moving it.

## 2. Add Adobe's CSInterface.js

Get `CSInterface.js` from the Adobe CEP Resources / CEP SDK and place it in:

`js\CSInterface.js`

This file is intentionally not redistributed in this prototype.

## 3. Build the Windows idle helper

Install the .NET 8 SDK, open a terminal in `IdleHelper`, then run:

`dotnet publish -c Release -r win-x64 --self-contained true -o publish`

The helper is launched independently of the panel and exits when After Effects
is no longer running.

## 4. Enable unsigned CEP extensions for development

After Effects 26.0 uses CEP 12. Add a DWORD named `PlayerDebugMode` with value `1` under:

`HKEY_CURRENT_USER\Software\Adobe\CSXS.<runtime-version>`

Restart After Effects. Enable **Allow Scripts to Write Files and Access Network** in Preferences > Scripting & Expressions if required by your CEP setup.

Open the panel from Window > Extensions (Legacy) > Time Tracker.

## Data

Project totals are stored in:

`<Windows Documents folder>\AE-TimeTracker\projects.json`

The helper's current idle reading is stored alongside it in `idle-seconds.txt`.
The key is the lower-cased absolute project path. Back up `projects.json` before experimenting.
