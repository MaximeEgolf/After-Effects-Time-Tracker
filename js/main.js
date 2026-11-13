/* global CSInterface, SystemPath */
(function () {
  "use strict";

  var cs = new CSInterface();
  var fs = require("fs");
  var path = require("path");
  var childProcess = require("child_process");

  var POLL_MS = 2000;
  var dataDir = path.join(cs.getSystemPath(SystemPath.MY_DOCUMENTS), "AE-TimeTracker");
  var idleFile = path.join(dataDir, "idle-seconds.txt");
  var extensionDir = cs.getSystemPath(SystemPath.EXTENSION);
  var helperExe = path.join(extensionDir, "IdleHelper", "publish", "AETT-IdleHelper.exe");

  function $(id) { return document.getElementById(id); }
  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    var d = Math.floor(seconds / 86400);
    var h = Math.floor((seconds % 86400) / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return [d, h, m].map(function (v, i) {
      return i === 0 ? String(v) : String(v).padStart(2, "0");
    }).join(":");
  }
  function startIdleHelper() {
    if (!fs.existsSync(helperExe)) {
      $("message").textContent = "Idle helper not found: " + helperExe;
      return;
    }

    fs.mkdirSync(dataDir, { recursive: true });
    var helper = childProcess.spawn(helperExe, [idleFile], {
      detached: true,
      windowsHide: true,
      stdio: "ignore"
    });
    helper.on("error", function (error) {
      $("message").textContent = "Idle helper failed to start: " + error.message;
    });
    helper.unref();
  }
  function updatePanel() {
    cs.evalScript("AETT_getTrackerState()", function (result) {
      if (!result || result === "EvalScript error.") {
        $("status").textContent = "Host script unavailable";
        $("status").className = "stopped";
        $("message").textContent = "Restart After Effects and reopen the panel.";
        return;
      }

      try {
        var state = JSON.parse(result);
        $("project").textContent = state.project;
        $("elapsed").textContent = formatTime(state.totalSeconds);
        $("status").textContent = state.status;
        $("status").className = state.status === "Tracking" ? "running" :
          (state.status === "Idle" ? "idle" : "stopped");
        $("message").textContent = state.message;
      } catch (error) {
        $("status").textContent = "Unavailable";
        $("status").className = "stopped";
        $("message").textContent = "Could not read tracker status: " + error.message;
      }
    });
  }

  startIdleHelper();
  cs.evalScript("AETT_startTracking()", function (result) {
    if (result === "EvalScript error.") {
      $("message").textContent = "Could not start background tracking in After Effects.";
    }
    updatePanel();
  });
  updatePanel();
  var timer = setInterval(updatePanel, POLL_MS);

  window.addEventListener("beforeunload", function () {
    clearInterval(timer);
  });
}());
