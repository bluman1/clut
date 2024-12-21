/* 
 * background.js (Service Worker for CLUT)
 * 
 * CLUT: Cycle Last Used Tabs
 */

let mru = [];
let slowSwitchOngoing = false;
let fastSwitchOngoing = false;
let intSwitchCount = 0;
let lastIntSwitchIndex = 0;
let slowtimerValue = 1500;
let fasttimerValue = 200;
let timer;
let slowswitchForward = false;
let initialized = false;

/* Logging for debugging — set to true to see console logs. */
const loggingOn = false;
function CLUTlog(str) {
  if (loggingOn) {
    console.log(str);
  }
}

/* Use Chrome Storage for version checks instead of localStorage */
function setLocalVersion(version) {
  chrome.storage.local.set({ version: version });
}

function getLocalVersion(callback) {
  chrome.storage.local.get("version", (data) => {
    callback(data.version);
  });
}

/* Retrieve extension version from manifest */
function getVersion() {
  const details = chrome.runtime.getManifest();
  return details.version;
}

/* Example: On installation or update, do something */
function onInstall() {
  CLUTlog("Extension Installed");
  // If you need to open a local page:
  // chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  // Opening an external page is discouraged in MV3:
  // chrome.tabs.create({ url: "http://www.harshay-buradkar.com/clut_update6.html" });
}

function onUpdate() {
  CLUTlog("Extension Updated");
  // Same note as onInstall
  // chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
}

/* Check if the version has changed. */
(async function checkVersionChange() {
  const currVersion = getVersion();
  getLocalVersion((prevVersion) => {
    CLUTlog("prev version: " + prevVersion);
    CLUTlog("curr version: " + currVersion);
    if (currVersion !== prevVersion) {
      if (typeof prevVersion === "undefined") {
        onInstall();
      } else {
        onUpdate();
      }
      setLocalVersion(currVersion);
    }
  });
})();

/* Commands listener */
chrome.commands.onCommand.addListener((command) => {
  processCommand(command);
});

chrome.action.onClicked.addListener((tab) => {
  CLUTlog("Action icon clicked");
  processCommand("alt_switch_fast");
});

/* Fired when extension is first installed or updated to a new version,
   or when Chrome is updated. */
chrome.runtime.onInstalled.addListener(() => {
  CLUTlog("onInstalled fired");
  initialize();
});

/* Note: onStartup is somewhat less necessary in MV3, but we keep it for compatibility. */
chrome.runtime.onStartup.addListener(() => {
  CLUTlog("onStartup fired");
  initialize();
});

function processCommand(command) {
  CLUTlog("Command received: " + command);
  let fastswitch = true;
  slowswitchForward = false;

  if (command === "alt_switch_fast") {
    fastswitch = true;
  } else if (command === "alt_switch_slow_backward") {
    fastswitch = false;
    slowswitchForward = false;
  } else if (command === "alt_switch_slow_forward") {
    fastswitch = false;
    slowswitchForward = true;
  }

  if (!slowSwitchOngoing && !fastSwitchOngoing) {
    if (fastswitch) {
      fastSwitchOngoing = true;
    } else {
      slowSwitchOngoing = true;
    }
    CLUTlog("CLUT::START_SWITCH");
    intSwitchCount = 0;
    doIntSwitch();
  } else if ((slowSwitchOngoing && !fastswitch) || (fastSwitchOngoing && fastswitch)) {
    CLUTlog("CLUT::DO_INT_SWITCH");
    doIntSwitch();
  } else if (slowSwitchOngoing && fastswitch) {
    endSwitch();
    fastSwitchOngoing = true;
    CLUTlog("CLUT::START_SWITCH");
    intSwitchCount = 0;
    doIntSwitch();
  } else if (fastSwitchOngoing && !fastswitch) {
    endSwitch();
    slowSwitchOngoing = true;
    CLUTlog("CLUT::START_SWITCH");
    intSwitchCount = 0;
    doIntSwitch();
  }

  if (timer) {
    if (fastSwitchOngoing || slowSwitchOngoing) {
      clearTimeout(timer);
    }
  }
  if (fastswitch) {
    timer = setTimeout(() => endSwitch(), fasttimerValue);
  } else {
    timer = setTimeout(() => endSwitch(), slowtimerValue);
  }
}

function doIntSwitch() {
  CLUTlog("CLUT:: in int switch, intSwitchCount: " + intSwitchCount + ", mru.length: " + mru.length);
  if (mru.length === 0) return;

  if (intSwitchCount < mru.length && intSwitchCount >= 0) {
    if (slowswitchForward) {
      decrementSwitchCounter();
    } else {
      incrementSwitchCounter();
    }
    const tabIdToMakeActive = mru[intSwitchCount];

    chrome.tabs.get(tabIdToMakeActive, (tab) => {
      if (chrome.runtime.lastError) {
        // Tab might be gone
        CLUTlog("CLUT:: invalid tab: " + chrome.runtime.lastError.message);
        removeItemAtIndexFromMRU(intSwitchCount);
        if (intSwitchCount >= mru.length) {
          intSwitchCount = 0;
        }
        doIntSwitch();
        return;
      }
      if (tab) {
        chrome.windows.update(tab.windowId, { focused: true }, () => {
          chrome.tabs.update(tabIdToMakeActive, { active: true, highlighted: true });
          lastIntSwitchIndex = intSwitchCount;
        });
      }
    });
  }
}

function endSwitch() {
  CLUTlog("CLUT::END_SWITCH");
  slowSwitchOngoing = false;
  fastSwitchOngoing = false;

  if (lastIntSwitchIndex < mru.length) {
    const tabId = mru[lastIntSwitchIndex];
    putExistingTabToTop(tabId);
  }
  printMRUSimple();
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!slowSwitchOngoing && !fastSwitchOngoing) {
    const index = mru.indexOf(activeInfo.tabId);
    if (index === -1) {
      CLUTlog("Unexpected scenario: tab not in MRU, adding to front");
      addTabToMRUAtFront(activeInfo.tabId);
    } else {
      putExistingTabToTop(activeInfo.tabId);
    }
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  CLUTlog("Tab create event fired with tab(" + tab.id + ")");
  addTabToMRUAtBack(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  CLUTlog("Tab remove event fired from tab(" + tabId + ")");
  removeTabFromMRU(tabId);
});

function addTabToMRUAtBack(tabId) {
  const index = mru.indexOf(tabId);
  if (index === -1) {
    mru.push(tabId);
  }
}

function addTabToMRUAtFront(tabId) {
  const index = mru.indexOf(tabId);
  if (index === -1) {
    mru.unshift(tabId);
  }
}

function putExistingTabToTop(tabId) {
  const index = mru.indexOf(tabId);
  if (index !== -1) {
    mru.splice(index, 1);
    mru.unshift(tabId);
  }
}

function removeTabFromMRU(tabId) {
  const index = mru.indexOf(tabId);
  if (index !== -1) {
    mru.splice(index, 1);
  }
}

function removeItemAtIndexFromMRU(index) {
  if (index < mru.length) {
    mru.splice(index, 1);
  }
}

function incrementSwitchCounter() {
  intSwitchCount = (intSwitchCount + 1) % mru.length;
}

function decrementSwitchCounter() {
  if (intSwitchCount === 0) {
    intSwitchCount = mru.length - 1;
  } else {
    intSwitchCount = intSwitchCount - 1;
  }
}

function initialize() {
  if (!initialized) {
    initialized = true;
    chrome.windows.getAll({ populate: true }, (windows) => {
      windows.forEach((win) => {
        win.tabs.forEach((tab) => {
          mru.unshift(tab.id);
        });
      });
      CLUTlog("MRU after init: " + mru);
    });
  }
}

function printMRUSimple() {
  CLUTlog("mru: " + mru);
}

initialize();
