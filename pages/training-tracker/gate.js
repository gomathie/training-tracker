// Access gate for the training tracker.
// - Shows a login screen until a valid 8-char code is entered.
// - Verifies the code via /api/verify-code and stores the returned session
//   token in localStorage (expires after 1 hour).
// - Exposes window.PilotGate.sendTask() for the tracker to report a checked
//   task to the Telegram group via /api/check-task.
(function () {
  "use strict";

  var SESSION_KEY = "pilot_access";
  var API_VERIFY = "/api/verify-code";
  var API_CHECK = "/api/check-task";

  var Gate = {
    token: null,
    granted: false,
    sendTask: sendTask,
  };
  window.PilotGate = Gate;

  // --- Session persistence ---------------------------------------------------

  function loadSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!s || !s.token || !s.expires || Date.now() > s.expires) {
        localStorage.removeItem(SESSION_KEY);
        return false;
      }
      Gate.token = s.token;
      Gate.granted = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveSession(token, ttlSeconds) {
    var s = { token: token, expires: Date.now() + ttlSeconds * 1000 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    Gate.token = token;
    Gate.granted = true;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    Gate.token = null;
    Gate.granted = false;
  }

  // --- Lock / unlock UI ------------------------------------------------------

  function unlock() {
    document.body.classList.remove("locked");
  }

  function lock() {
    document.body.classList.add("locked");
    var input = document.getElementById("gateInput");
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  // --- Verify code -----------------------------------------------------------

  function setMsg(text, kind) {
    var el = document.getElementById("gateMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "gate-msg" + (kind ? " " + kind : "");
  }

  async function verify(code) {
    var res = await fetch(API_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code }),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Verification failed");
    }
    return data;
  }

  function wireForm() {
    var form = document.getElementById("gateForm");
    var input = document.getElementById("gateInput");
    var submit = document.getElementById("gateSubmit");
    if (!form || !input || !submit) return;

    // Keep the input uppercase and code-shaped as the user types.
    input.addEventListener("input", function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(code)) {
        setMsg("Enter the full 8-character code.", "error");
        return;
      }
      submit.disabled = true;
      setMsg("Checking…", "info");
      try {
        var data = await verify(code);
        saveSession(data.token, data.expiresIn || 3600);
        setMsg("", null);
        unlock();
      } catch (err) {
        setMsg(err.message || "Invalid code", "error");
        input.value = "";
        input.focus();
      } finally {
        submit.disabled = false;
      }
    });
  }

  // --- Report a checked task -------------------------------------------------

  async function sendTask(taskName) {
    if (!Gate.granted || !Gate.token) return;
    try {
      var res = await fetch(API_CHECK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + Gate.token,
        },
        body: JSON.stringify({ task: taskName }),
      });
      if (res.status === 401) {
        // Session expired or revoked — send the user back to the gate.
        clearSession();
        lock();
        setMsg("Your session expired. Enter a new code.", "error");
        return;
      }
      if (!res.ok) {
        toast("Could not notify Telegram", true);
        return;
      }
      toast("Sent to Telegram ✓", false);
    } catch (e) {
      toast("Could not notify Telegram", true);
    }
  }

  // --- Toast -----------------------------------------------------------------

  var toastEl = null;
  var toastTimer = null;
  function toast(text, isError) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "gate-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.toggle("error", !!isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  // --- Init ------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    wireForm();
    if (loadSession()) {
      unlock();
    } else {
      lock();
    }
  });
})();
