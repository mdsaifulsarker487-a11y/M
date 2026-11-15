import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const host = document.querySelector(".topright");
const panel = document.createElement("div");
panel.className = "auth-panel";
panel.innerHTML = `
  <button class="lang" id="auth-open">Sign in</button>
  <div class="auth-popover" id="auth-popover" hidden>
    <div class="auth-title">DOLFish Control Center</div>
    <p class="auth-help" id="auth-status">Sign in with your owner account.</p>
    <form id="auth-form">
      <input class="auth-input" id="auth-email" type="email" autocomplete="username" placeholder="Email address" required>
      <input class="auth-input" id="auth-password" type="password" autocomplete="current-password" placeholder="Password (min. 8 characters)" minlength="8" required>
      <div class="auth-actions">
        <button class="primary" type="submit" id="auth-submit">Sign in</button>
        <button class="ghost" type="button" id="auth-signup">Create account</button>
      </div>
    </form>
    <button class="auth-logout" id="auth-logout" hidden>Sign out</button>
  </div>`;
host.insertBefore(panel, host.querySelector(".profile"));

const openBtn = panel.querySelector("#auth-open");
const popover = panel.querySelector("#auth-popover");
const form = panel.querySelector("#auth-form");
const status = panel.querySelector("#auth-status");
const submit = panel.querySelector("#auth-submit");
const signup = panel.querySelector("#auth-signup");
const logout = panel.querySelector("#auth-logout");
let mode = "signin";

openBtn.addEventListener("click", () => { popover.hidden = !popover.hidden; });
function showMessage(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#ff9b9b" : "#a9c5e8";
}
function setSignedIn(user) {
  if (!user) {
    openBtn.textContent = "Sign in";
    form.hidden = false;
    signup.hidden = false;
    logout.hidden = true;
    showMessage("Sign in with your owner account.");
    return;
  }
  openBtn.textContent = user.email ? user.email.split("@")[0] : "Account";
  form.hidden = true;
  signup.hidden = true;
  logout.hidden = false;
  showMessage("Signed in. Access to management data requires an owner/admin role assigned securely by the project owner.");
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  const email = panel.querySelector("#auth-email").value.trim();
  const password = panel.querySelector("#auth-password").value;
  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      showMessage(data.session ? "Account created. Ask the project owner to grant your role." : "Check your email to confirm your account, then sign in.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSignedIn(data.user);
    }
  } catch (error) {
    showMessage(error.message || "Authentication failed.", true);
  } finally {
    submit.disabled = false;
  }
});
signup.addEventListener("click", () => {
  mode = mode === "signup" ? "signin" : "signup";
  submit.textContent = mode === "signup" ? "Create account" : "Sign in";
  signup.textContent = mode === "signup" ? "Back to sign in" : "Create account";
  panel.querySelector("#auth-password").autocomplete = mode === "signup" ? "new-password" : "current-password";
});
logout.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) showMessage(error.message, true);
  else setSignedIn(null);
});
const { data: { session } } = await supabase.auth.getSession();
setSignedIn(session?.user ?? null);
supabase.auth.onAuthStateChange((_event, sessionNow) => setSignedIn(sessionNow?.user ?? null));
