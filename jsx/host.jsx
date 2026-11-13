// Runs in After Effects' persistent ExtendScript engine.
if (typeof AETT_taskId === "undefined") {
    var AETT_idleLimitSeconds = 300;
    var AETT_pollMs = 2000;
    var AETT_saveMs = 10000;
    var AETT_dataDir = Folder.myDocuments.fsName + "/AE-TimeTracker";
    var AETT_dataFile = File(AETT_dataDir + "/projects.json");
    var AETT_idleFile = File(AETT_dataDir + "/idle-seconds.txt");
    var AETT_records = {};
    var AETT_currentPath = "";
    var AETT_idleSeconds = 0;
    var AETT_helperAvailable = false;
    var AETT_lastTick = new Date().getTime();
    var AETT_lastSave = AETT_lastTick;
    var AETT_taskId = null;
    var AETT_error = "";
    var AETT_storageAvailable = true;
    AETT_loadRecords();
}

function AETT_escapeJson(value) {
    return String(value).replace(/[\\"\u0000-\u001f]/g, function (character) {
        var escapes = {
            "\\": "\\\\",
            "\"": "\\\"",
            "\b": "\\b",
            "\f": "\\f",
            "\n": "\\n",
            "\r": "\\r",
            "\t": "\\t"
        };
        var escaped = escapes[character];
        if (escaped) return escaped;
        var code = character.charCodeAt(0).toString(16);
        return "\\u" + ("0000" + code).slice(-4);
    });
}

function AETT_loadRecords() {
    if (!AETT_dataFile.exists) return;
    if (!AETT_dataFile.open("r")) {
        AETT_error = "Could not open saved project times.";
        AETT_storageAvailable = false;
        return;
    }

    try {
        var contents = AETT_dataFile.read();
        var loaded = eval("(" + contents + ")");
        if (!loaded || typeof loaded !== "object") {
            throw new Error("Saved project times have an invalid format.");
        }
        AETT_records = loaded;
    } catch (error) {
        AETT_error = "Could not read saved project times: " + error.toString();
        AETT_storageAvailable = false;
    } finally {
        AETT_dataFile.close();
    }
}

function AETT_saveRecords() {
    if (!AETT_storageAvailable) return;
    var folder = Folder(AETT_dataDir);
    if (!folder.exists && !folder.create()) {
        AETT_error = "Could not create the tracker data folder.";
        return;
    }

    var entries = [];
    for (var key in AETT_records) {
        if (!AETT_records.hasOwnProperty(key)) continue;
        var record = AETT_records[key];
        entries.push("\"" + AETT_escapeJson(key) + "\":{\"path\":\"" +
            AETT_escapeJson(record.path) + "\",\"totalSeconds\":" +
            Math.max(0, Number(record.totalSeconds) || 0) + "}");
    }

    var temporaryFile = File(AETT_dataDir + "/projects.json.tmp");
    if (!temporaryFile.open("w")) {
        AETT_error = "Could not write saved project times.";
        return;
    }
    var writeSucceeded = false;
    try {
        writeSucceeded = temporaryFile.write("{" + entries.join(",") + "}");
    } catch (error) {
        AETT_error = "Could not write saved project times: " + error.toString();
    }
    temporaryFile.close();
    if (!writeSucceeded) {
        if (!AETT_error) AETT_error = "Could not write saved project times.";
        return;
    }

    var backupFile = File(AETT_dataDir + "/projects.json.bak");
    if (backupFile.exists && !backupFile.remove()) {
        AETT_error = "Could not replace the saved project times backup.";
        return;
    }
    var hadExistingFile = AETT_dataFile.exists;
    if (hadExistingFile && !AETT_dataFile.rename("projects.json.bak")) {
        AETT_error = "Could not back up the saved project times file.";
        return;
    }
    AETT_dataFile = File(AETT_dataDir + "/projects.json");
    if (!temporaryFile.rename("projects.json")) {
        if (hadExistingFile) {
            backupFile.rename("projects.json");
            AETT_dataFile = File(AETT_dataDir + "/projects.json");
        }
        AETT_error = "Could not finalize the saved project times file.";
        return;
    }
    AETT_dataFile = File(AETT_dataDir + "/projects.json");
    if (backupFile.exists) backupFile.remove();
    AETT_error = "";
}

function AETT_readIdleSeconds() {
    AETT_helperAvailable = false;
    if (!AETT_idleFile.exists) return;

    var modified = AETT_idleFile.modified;
    if (!modified || new Date().getTime() - modified.getTime() > 5000) return;
    if (!AETT_idleFile.open("r")) return;
    var value = Number(AETT_idleFile.read());
    AETT_idleFile.close();

    if (isNaN(value) || value < 0) return;
    AETT_idleSeconds = value;
    AETT_helperAvailable = true;
}

function AETT_getOpenProjectPath() {
    try {
        if (!app.project || !app.project.file) return "";
        return app.project.file.fsName;
    } catch (error) {
        return "";
    }
}

function AETT_tick() {
    var now = new Date().getTime();
    var delta = Math.min((now - AETT_lastTick) / 1000, 5);
    AETT_lastTick = now;
    AETT_readIdleSeconds();

    AETT_currentPath = AETT_getOpenProjectPath();
    if (AETT_currentPath) {
        var key = AETT_currentPath.toLowerCase();
        if (!AETT_records[key]) {
            AETT_records[key] = { path: AETT_currentPath, totalSeconds: 0 };
        }
        if (AETT_helperAvailable && AETT_idleSeconds < AETT_idleLimitSeconds) {
            AETT_records[key].totalSeconds += delta;
        }
    }

    if (now - AETT_lastSave >= AETT_saveMs) {
        AETT_saveRecords();
        AETT_lastSave = now;
    }
}

function AETT_startTracking() {
    if (AETT_taskId === null) {
        if (AETT_taskId === null) AETT_loadRecords();
        AETT_tick();
        AETT_taskId = app.scheduleTask("AETT_tick()", AETT_pollMs, true);
    }
    return "started";
}

function AETT_getTrackerState() {
    var key = AETT_currentPath ? AETT_currentPath.toLowerCase() : "";
    var record = key && AETT_records[key] ? AETT_records[key] : null;
    var status = !AETT_currentPath ? "Not tracking" :
        (!AETT_helperAvailable ? "Idle helper missing" :
            (AETT_idleSeconds < AETT_idleLimitSeconds ? "Tracking" : "Idle"));
    var message = AETT_error || "Tracking continues when the panel is closed.";
    if (status === "Idle helper missing" && !AETT_error) {
        message = "Idle helper is starting or unavailable. Tracking is paused until it reports activity.";
    }

    return "{\"project\":\"" + AETT_escapeJson(
        AETT_currentPath ? File(AETT_currentPath).name : "No saved project open") +
        "\",\"totalSeconds\":" + (record ? Number(record.totalSeconds) || 0 : 0) +
        ",\"status\":\"" + AETT_escapeJson(status) +
        "\",\"message\":\"" + AETT_escapeJson(message) + "\"}";
}

AETT_loadRecords();
