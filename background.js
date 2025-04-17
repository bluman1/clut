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
// Use clearer names for timer durations
const SLOW_SWITCH_TIMEOUT = 1500; // ms
const FAST_SWITCH_TIMEOUT = 350; // ms, increased slightly from 200 for reliability
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
// Use async/await for cleaner version check
(async function checkVersionChange() {
  const currVersion = getVersion();
  // Use await with a Promise wrapper for chrome.storage.local.get
  const prevVersion = await new Promise(resolve => {
      chrome.storage.local.get("version", (data) => resolve(data.version));
  });

  CLUTlog("prev version: " + prevVersion);
  CLUTlog("curr version: " + currVersion);
  if (currVersion !== prevVersion) {
    if (typeof prevVersion === "undefined") {
      onInstall();
    } else {
      onUpdate();
    }
    // Use await for setting version as well
    await new Promise(resolve => chrome.storage.local.set({ version: currVersion }, resolve));
  }
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
  // Guard: Do nothing if MRU is empty
  if (mru.length === 0) {
      CLUTlog("CLUT:: Command ignored, MRU is empty.");
      return;
  }

  let isFastSwitchCommand = true;
  slowswitchForward = false; // Reset direction flag

  if (command === "alt_switch_fast") {
    isFastSwitchCommand = true;
  } else if (command === "alt_switch_slow_backward") {
    isFastSwitchCommand = false;
    slowswitchForward = false;
  } else if (command === "alt_switch_slow_forward") {
    isFastSwitchCommand = false;
    slowswitchForward = true;
  }

  // Clear existing timer before processing new command
  if (timer) {
      clearTimeout(timer);
  }

  if (!slowSwitchOngoing && !fastSwitchOngoing) {
    // Start a new switch sequence
    if (isFastSwitchCommand) {
      fastSwitchOngoing = true;
    } else {
      slowSwitchOngoing = true;
    }
    CLUTlog("CLUT::START_SWITCH");
    intSwitchCount = 0; // Reset count for new sequence
    doIntSwitch(); // Start the first step
  } else if ((slowSwitchOngoing && !isFastSwitchCommand) || (fastSwitchOngoing && isFastSwitchCommand)) {
    // Continue the current switch sequence type
    CLUTlog("CLUT::DO_INT_SWITCH (Continue)");
    doIntSwitch(); // Perform the next step
  } else if (slowSwitchOngoing && isFastSwitchCommand) {
    // Switch from Slow to Fast mode
    CLUTlog("CLUT::SWITCH_MODE (Slow -> Fast)");
    endSwitch(false); // End slow switch *without* updating MRU yet
    fastSwitchOngoing = true;
    slowSwitchOngoing = false; // Explicitly reset slow state
    intSwitchCount = 0; // Reset count for new sequence type
    doIntSwitch(); // Start the first step of fast switch
  } else if (fastSwitchOngoing && !isFastSwitchCommand) {
    // Switch from Fast to Slow mode
    CLUTlog("CLUT::SWITCH_MODE (Fast -> Slow)");
    endSwitch(false); // End fast switch *without* updating MRU yet
    slowSwitchOngoing = true;
    fastSwitchOngoing = false; // Explicitly reset fast state
    intSwitchCount = 0; // Reset count for new sequence type
    doIntSwitch(); // Start the first step of slow switch
  }

  // Set the timer for the current switch type
  if (fastSwitchOngoing) {
    timer = setTimeout(() => endSwitch(true), FAST_SWITCH_TIMEOUT);
  } else if (slowSwitchOngoing) {
    timer = setTimeout(() => endSwitch(true), SLOW_SWITCH_TIMEOUT);
  }
}

function doIntSwitch() {
  CLUTlog(`CLUT:: in int switch, count: ${intSwitchCount}, mru.length: ${mru.length}, forward: ${slowswitchForward}`);
  // Guard: If MRU became empty during operations, end the switch
  if (mru.length === 0) {
      CLUTlog("CLUT:: MRU empty, ending switch.");
      endSwitch(false); // End without MRU update as there's nothing to update
      return;
  }

  // Calculate the *next* index based on direction *before* accessing MRU
  if (intSwitchCount === 0 && !slowSwitchOngoing && !fastSwitchOngoing) {
      // This case should ideally not be hit if processCommand starts correctly
      CLUTlog("CLUT:: Warning: doIntSwitch called with no switch ongoing.");
      // Default to first step if state is inconsistent
      intSwitchCount = 1; // Start with the second item (index 1)
  } else {
      // Determine next index based on current state
      if (slowswitchForward) { // Slow forward means going *back* in MRU list (towards index 0)
          decrementSwitchCounter();
      } else { // Fast switch or slow backward means going *forward* in MRU list
          incrementSwitchCounter();
      }
  }

  // Ensure index is valid after increment/decrement
  if (intSwitchCount < 0 || intSwitchCount >= mru.length) {
      CLUTlog(`CLUT:: Invalid index ${intSwitchCount} after counter change. Resetting.`);
      intSwitchCount = 0; // Reset to the most recent tab if index is invalid
      // Avoid infinite loop if MRU is still empty after reset attempt
      if (mru.length === 0) {
          endSwitch(false);
          return;
      }
  }

  const tabIdToMakeActive = mru[intSwitchCount];
  CLUTlog(`CLUT:: Attempting to switch to index: ${intSwitchCount}, tabId: ${tabIdToMakeActive}`);

  // Verify tab exists before trying to activate it
  chrome.tabs.get(tabIdToMakeActive, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist anymore
      CLUTlog(`CLUT:: Tab ${tabIdToMakeActive} not found: ${chrome.runtime.lastError.message}. Removing from MRU.`);
      const removedAtIndex = intSwitchCount; // Store index before removal
      removeItemAtIndexFromMRU(removedAtIndex); // Remove the invalid tab ID

      // Adjust index *if necessary* after removal.
      // If the removed item was *before* the current logical position in the *next* cycle,
      // the indices shift. However, simply retrying might be safer.
      // Let's retry the *same logical step* (which might now point to a different tab or wrap around)
      // Decrementing might skip a tab. Resetting might be too drastic.
      // Let's just call doIntSwitch again without changing intSwitchCount here.
      // The next iteration will calculate the index based on the *updated* MRU.
      // But first, check if MRU became empty.
      if (mru.length === 0) {
          CLUTlog("CLUT:: MRU became empty after removing invalid tab.");
          endSwitch(false);
          return;
      }
      // Ensure index is still valid before retrying
      if (intSwitchCount >= mru.length) {
          intSwitchCount = 0; // Wrap around if removal made index invalid
      }
      CLUTlog(`CLUT:: Retrying doIntSwitch after removing invalid tab at index ${removedAtIndex}.`);
      // Re-set the timer as this step took time.
      clearTimeout(timer);
       if (fastSwitchOngoing) {
           timer = setTimeout(() => endSwitch(true), FAST_SWITCH_TIMEOUT);
       } else if (slowSwitchOngoing) {
           timer = setTimeout(() => endSwitch(true), SLOW_SWITCH_TIMEOUT);
       }
      doIntSwitch(); // Try the next logical step immediately
      return; // Exit this failed attempt
    }

    // Tab exists, proceed to activate
    if (tab) {
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        // Check for error updating window (e.g., window closed)
        if (chrome.runtime.lastError) {
            CLUTlog(`CLUT:: Error focusing window ${tab.windowId}: ${chrome.runtime.lastError.message}`);
            return; // Stop this switch attempt
        }
        chrome.tabs.update(tabIdToMakeActive, { active: true, highlighted: true }, () => {
            if (chrome.runtime.lastError) {
                CLUTlog(`CLUT:: Error activating tab ${tabIdToMakeActive}: ${chrome.runtime.lastError.message}`);
                removeTabFromMRU(tabIdToMakeActive);
                return; // Stop this switch attempt
            }
            lastIntSwitchIndex = intSwitchCount;
            CLUTlog(`CLUT:: Successfully switched to index: ${lastIntSwitchIndex}, tabId: ${tabIdToMakeActive}`);
        });
      });
    } else {
        CLUTlog(`CLUT:: Tab ${tabIdToMakeActive} object is unexpectedly null/undefined.`);
        removeItemAtIndexFromMRU(intSwitchCount);
    }
  });
}

// Modified endSwitch to accept an argument whether to update MRU
function endSwitch(updateMRU) {
  CLUTlog(`CLUT::END_SWITCH - Update MRU: ${updateMRU}`);
  if (timer) {
      clearTimeout(timer);
      timer = null;
  }
  slowSwitchOngoing = false;
  fastSwitchOngoing = false;

  if (updateMRU && lastIntSwitchIndex < mru.length) {
    const tabId = mru[lastIntSwitchIndex];
    CLUTlog(`CLUT:: Finalizing switch. Moving tab ${tabId} (index ${lastIntSwitchIndex}) to top.`);
    putExistingTabToTop(tabId);
  } else {
      CLUTlog(`CLUT:: Switch ended without MRU update (mode switch or invalid index ${lastIntSwitchIndex}).`);
  }

  intSwitchCount = 0;
  lastIntSwitchIndex = 0;

  printMRUSimple();
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!slowSwitchOngoing && !fastSwitchOngoing) {
    CLUTlog(`Tab activated (manual): ${activeInfo.tabId}. Resetting state.`);
    intSwitchCount = 0;
    lastIntSwitchIndex = 0;

    const index = mru.indexOf(activeInfo.tabId);
    if (index === -1) {
      CLUTlog("Unexpected scenario: activated tab not in MRU, adding to front");
      addTabToMRUAtFront(activeInfo.tabId);
    } else {
      putExistingTabToTop(activeInfo.tabId);
    }
    printMRUSimple();
  } else {
      CLUTlog(`Tab activated (during CLUT switch): ${activeInfo.tabId}. No MRU change yet.`);
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
    CLUTlog(`Removing tab ${tabId} at index ${index} from MRU.`);
    mru.splice(index, 1);
  }
}

function removeItemAtIndexFromMRU(index) {
  if (index >= 0 && index < mru.length) {
    const removedTabId = mru[index];
    CLUTlog(`Removing tab ${removedTabId} at index ${index} from MRU.`);
    mru.splice(index, 1);
  } else {
      CLUTlog(`Attempted to remove tab at invalid index ${index}. MRU length: ${mru.length}`);
  }
}

function incrementSwitchCounter() {
  intSwitchCount = (intSwitchCount + 1) % mru.length;
  CLUTlog(`Incremented switch counter to: ${intSwitchCount}`);
}

function decrementSwitchCounter() {
  if (intSwitchCount === 0) {
    intSwitchCount = mru.length - 1;
  } else {
    intSwitchCount = intSwitchCount - 1;
  }
  if (intSwitchCount < 0) intSwitchCount = 0;
  CLUTlog(`Decremented switch counter to: ${intSwitchCount}`);
}

async function initialize() {
    if (initialized) return;
    initialized = true;
    CLUTlog("Initializing MRU list...");
    mru = [];
    try {
        const windows = await chrome.windows.getAll({ populate: true });
        windows.forEach((win) => {
            win.tabs.forEach((tab) => {
                if (tab.id) {
                    if (tab.active && win.focused) {
                        mru.unshift(tab.id);
                    } else {
                        mru.push(tab.id);
                    }
                }
            });
        });
        CLUTlog("MRU initialized: " + mru);
        printMRUSimple();
    } catch (error) {
        CLUTlog("Error during initialization: " + error);
        initialized = false;
    }
}

function printMRUSimple() {
  CLUTlog("mru: " + mru);
}

initialize();
