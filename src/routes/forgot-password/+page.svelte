<script>
  import { enhance } from '$app/forms';

  export let form;
</script>

<svelte:head>
  <title>Reset password · Origins Client Portal</title>
  <meta
    name="description"
    content="Securely reset your Origins Client Portal password."
  />
</svelte:head>

<div class="auth-shell">
  <section class="auth-brand-panel">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <a class="auth-brand" href="/login">
      <img
        src="/images/origins-logo.png"
        alt="Origins"
        class="auth-logo"
      />

      <span class="brand-copy">
        <strong>ORIGINS</strong>
        <span>CLIENT PORTAL</span>
      </span>
    </a>

    <div class="auth-copy">
      <span class="eyebrow">ACCOUNT RECOVERY</span>

      <h1>
        Get back into your
        <em>workspace.</em>
      </h1>

      <p>
        We’ll send a secure password reset link to the email address
        associated with your Origins account.
      </p>

      <div class="recovery-note">
        <div class="recovery-icon">✦</div>

        <div>
          <strong>Secure account recovery</strong>
          <span>
            Your account remains protected while we help you regain access.
          </span>
        </div>
      </div>
    </div>

    <div class="auth-foot">
      <span>ORIGINS LTD</span>
      <span class="foot-dot"></span>
      <span>SECURE ACCESS</span>
    </div>
  </section>

  <main class="auth-panel">
    <div class="auth-card">
      <div class="card-glow"></div>

      <div class="auth-card-head">
        <span class="eyebrow">PASSWORD RESET</span>

        <h2>Forgot password?</h2>

        <p>
          Enter your email and we'll send you a secure link to reset
          your password.
        </p>
      </div>

      {#if form?.error}
        <div class="auth-message auth-error">
          <span class="message-icon">!</span>
          <span>{form.error}</span>
        </div>
      {/if}

      {#if form?.success}
        <div class="auth-message auth-success">
          <span class="message-icon">✓</span>
          <div>
            <strong>Check your inbox</strong>
            <span>{form.success}</span>
          </div>
        </div>
      {/if}

      <form class="auth-form" method="POST" use:enhance>
        <label>
          <span class="field-label">Email address</span>

          <div class="input-wrap">
            <span class="input-icon">@</span>

            <input
              name="email"
              type="email"
              autocomplete="email"
              value={form?.email ?? ''}
              required
              placeholder="you@company.com"
            />
          </div>
        </label>

        <button class="button primary" type="submit">
          <span>Send reset link</span>
          <span class="button-arrow">↗</span>
        </button>
      </form>

      <div class="auth-divider">
        <span></span>
        <small>SECURE RECOVERY</small>
        <span></span>
      </div>

      <div class="auth-bottom">
        <a href="/login">
          <span class="back-arrow">←</span>
          Back to sign in
        </a>
      </div>

      <div class="auth-legal">
        If an account exists for this email address, we'll send
        instructions to reset your password.
      </div>
    </div>
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

  :global(*) {
    box-sizing: border-box;
  }

  :global(html),
  :global(body) {
    margin: 0;
    min-height: 100%;
  }

  :global(body) {
    background: #07100c;
    color: #f4f7f5;
    font-family: Inter, sans-serif;
  }

  :global(a) {
    color: inherit;
  }

  .auth-shell {
    position: relative;
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(440px, 0.95fr) minmax(500px, 1.05fr);
    overflow: hidden;

    background:
      radial-gradient(
        circle at 15% 15%,
        rgba(0, 212, 126, 0.1),
        transparent 32%
      ),
      #07100c;
  }

  /* LEFT PANEL */

  .auth-brand-panel {
    position: relative;
    min-height: 100vh;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    padding: 46px 7vw 36px;

    overflow: hidden;

    border-right: 1px solid rgba(255, 255, 255, 0.06);

    background:
      linear-gradient(
        145deg,
        rgba(9, 26, 18, 0.98),
        rgba(5, 14, 10, 0.96)
      );
  }

  .ambient {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  .ambient-one {
    width: 420px;
    height: 420px;
    top: -180px;
    left: -160px;

    background: rgba(0, 212, 126, 0.08);
    filter: blur(2px);
  }

  .ambient-two {
    width: 360px;
    height: 360px;
    right: -200px;
    bottom: -140px;

    background: rgba(0, 212, 126, 0.045);
    filter: blur(2px);
  }

  .auth-brand {
    position: relative;
    z-index: 2;

    width: fit-content;

    display: flex;
    align-items: center;
    gap: 12px;

    text-decoration: none;
  }

  .auth-logo {
    width: 66px;
    height: 66px;

    display: block;

    object-fit: contain;
    flex-shrink: 0;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .brand-copy strong {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.24em;
  }

  .brand-copy span {
    color: rgba(255, 255, 255, 0.42);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.24em;
  }

  .auth-copy {
    position: relative;
    z-index: 2;

    max-width: 620px;

    margin: auto 0;
    padding: 90px 0;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;

    color: #00d47e;

    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
  }

  .eyebrow::before {
    content: '';

    width: 20px;
    height: 1px;

    background: #00d47e;
    opacity: 0.7;
  }

  .auth-copy h1 {
    max-width: 600px;

    margin: 22px 0;

    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(48px, 5vw, 76px);
    font-weight: 500;
    line-height: 0.98;
    letter-spacing: -0.045em;
  }

  .auth-copy h1 em {
    color: #00d47e;
    font-weight: 500;
  }

  .auth-copy > p {
    max-width: 500px;

    margin: 0;

    color: rgba(255, 255, 255, 0.54);

    font-size: 14px;
    line-height: 1.8;
  }

  .recovery-note {
    max-width: 410px;

    display: flex;
    align-items: center;
    gap: 14px;

    margin-top: 46px;
    padding-top: 22px;

    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  .recovery-icon {
    width: 38px;
    height: 38px;

    display: grid;
    place-items: center;
    flex-shrink: 0;

    border: 1px solid rgba(0, 212, 126, 0.2);
    border-radius: 50%;

    color: #00d47e;
    background: rgba(0, 212, 126, 0.05);

    font-size: 13px;
  }

  .recovery-note strong {
    display: block;

    margin-bottom: 5px;

    font-size: 11px;
    font-weight: 600;
  }

  .recovery-note div:last-child span {
    display: block;

    max-width: 330px;

    color: rgba(255, 255, 255, 0.36);

    font-size: 10px;
    line-height: 1.55;
  }

  .auth-foot {
    position: relative;
    z-index: 2;

    display: flex;
    align-items: center;
    gap: 10px;

    color: rgba(255, 255, 255, 0.28);

    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.18em;
  }

  .foot-dot {
    width: 3px;
    height: 3px;

    border-radius: 50%;

    background: #00d47e;
  }

  /* RIGHT PANEL */

  .auth-panel {
    min-height: 100vh;

    display: grid;
    place-items: center;

    padding: 50px;

    background:
      radial-gradient(
        circle at 70% 25%,
        rgba(0, 212, 126, 0.045),
        transparent 35%
      ),
      #09110d;
  }

  .auth-card {
    position: relative;

    width: min(100%, 480px);

    padding: 44px;

    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;

    background:
      linear-gradient(
        145deg,
        rgba(19, 29, 24, 0.96),
        rgba(11, 19, 15, 0.98)
      );

    box-shadow:
      0 35px 90px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.035);

    backdrop-filter: blur(24px);
  }

  .card-glow {
    position: absolute;

    top: -1px;
    left: 12%;

    width: 76%;
    height: 1px;

    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(0, 212, 126, 0.55),
        transparent
      );
  }

  .auth-card-head h2 {
    margin: 14px 0 10px;

    font-family: 'Playfair Display', Georgia, serif;
    font-size: 40px;
    font-weight: 500;
    letter-spacing: -0.035em;
  }

  .auth-card-head p {
    max-width: 380px;

    margin: 0;

    color: rgba(255, 255, 255, 0.43);

    font-size: 12px;
    line-height: 1.7;
  }

  /* MESSAGES */

  .auth-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;

    margin-top: 24px;
    padding: 13px 14px;

    border-radius: 11px;

    font-size: 11px;
    line-height: 1.5;
  }

  .auth-error {
    border: 1px solid rgba(255, 80, 80, 0.16);
    background: rgba(255, 80, 80, 0.06);
    color: #ff9a9a;
  }

  .auth-success {
    border: 1px solid rgba(0, 212, 126, 0.16);
    background: rgba(0, 212, 126, 0.06);
    color: #70e8b0;
  }

  .auth-success strong {
    display: block;
    margin-bottom: 3px;
    color: #a5f3cb;
    font-size: 11px;
  }

  .message-icon {
    width: 20px;
    height: 20px;

    display: grid;
    place-items: center;
    flex-shrink: 0;

    border-radius: 50%;

    background: rgba(255, 255, 255, 0.06);

    font-size: 10px;
  }

  /* FORM */

  .auth-form {
    display: grid;
    gap: 20px;

    margin-top: 32px;
  }

  .auth-form label {
    display: grid;
    gap: 8px;
  }

  .field-label {
    color: rgba(255, 255, 255, 0.72);

    font-size: 10px;
    font-weight: 600;
  }

  .input-wrap {
    position: relative;
  }

  .input-icon {
    position: absolute;

    top: 50%;
    left: 15px;

    z-index: 1;

    transform: translateY(-50%);

    color: rgba(255, 255, 255, 0.25);

    font-size: 11px;

    pointer-events: none;
  }

  .input-wrap input {
    width: 100%;
    height: 52px;

    padding: 0 15px 0 42px;

    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 11px;

    outline: none;

    background: rgba(255, 255, 255, 0.035);

    color: #fff;

    font: inherit;
    font-size: 12px;

    transition:
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .input-wrap input::placeholder {
    color: rgba(255, 255, 255, 0.22);
  }

  .input-wrap input:hover {
    border-color: rgba(255, 255, 255, 0.13);
  }

  .input-wrap input:focus {
    border-color: rgba(0, 212, 126, 0.55);

    background: rgba(0, 212, 126, 0.025);

    box-shadow:
      0 0 0 4px rgba(0, 212, 126, 0.055);
  }

  /* BUTTON */

  .button.primary {
    position: relative;

    width: 100%;
    height: 54px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    margin-top: 4px;

    border: 0;
    border-radius: 11px;

    background: #00d47e;
    color: #04100a;

    font-family: Inter, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;

    cursor: pointer;
    overflow: hidden;

    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  .button.primary::before {
    content: '';

    position: absolute;
    inset: 0;

    background:
      linear-gradient(
        110deg,
        transparent 20%,
        rgba(255, 255, 255, 0.25),
        transparent 70%
      );

    transform: translateX(-100%);

    transition: transform 500ms ease;
  }

  .button.primary:hover {
    background: #16df8b;

    transform: translateY(-1px);

    box-shadow:
      0 12px 30px rgba(0, 212, 126, 0.17);
  }

  .button.primary:hover::before {
    transform: translateX(100%);
  }

  .button.primary:active {
    transform: translateY(0);
  }

  .button-arrow {
    font-size: 14px;
  }

  /* FOOTER */

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;

    margin: 30px 0 22px;
  }

  .auth-divider span {
    flex: 1;
    height: 1px;

    background: rgba(255, 255, 255, 0.06);
  }

  .auth-divider small {
    color: rgba(255, 255, 255, 0.2);

    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  .auth-bottom {
    display: flex;
    justify-content: center;
  }

  .auth-bottom a {
    display: inline-flex;
    align-items: center;
    gap: 7px;

    color: #00d47e;

    font-size: 10px;
    font-weight: 600;

    text-decoration: none;

    transition:
      opacity 160ms ease,
      transform 160ms ease;
  }

  .auth-bottom a:hover {
    opacity: 0.72;
    transform: translateX(-2px);
  }

  .back-arrow {
    font-size: 13px;
  }

  .auth-legal {
    margin-top: 24px;

    color: rgba(255, 255, 255, 0.2);

    font-size: 8px;
    line-height: 1.6;

    text-align: center;
  }

  /* RESPONSIVE */

  @media (max-width: 1000px) {
    .auth-shell {
      grid-template-columns: 1fr;
    }

    .auth-brand-panel {
      min-height: auto;

      padding: 32px;

      border-right: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .auth-copy {
      padding: 80px 0 40px;
    }

    .auth-copy h1 {
      font-size: clamp(42px, 8vw, 64px);
    }

    .recovery-note {
      display: none;
    }

    .auth-foot {
      display: none;
    }

    .auth-panel {
      min-height: auto;
      padding: 60px 24px;
    }
  }

  @media (max-width: 560px) {
    .auth-brand-panel {
      padding: 24px;
    }

    .auth-logo {
      width: 54px;
      height: 54px;
    }

    .auth-copy {
      padding: 60px 0 20px;
    }

    .auth-copy h1 {
      font-size: 42px;
    }

    .auth-copy > p {
      font-size: 12px;
    }

    .auth-panel {
      padding: 30px 16px 50px;
    }

    .auth-card {
      padding: 28px 22px;
      border-radius: 18px;
    }

    .auth-card-head h2 {
      font-size: 36px;
    }
  }
</style>