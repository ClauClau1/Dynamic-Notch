// Google Analytics, only with consent. Each page's <head> loads the Google tag with analytics storage
// denied (Consent Mode); this asks once with a banner, remembers the answer, and turns it on if the
// visitor accepts. "Cookie settings" in the footer asks again. It also counts downloads of the app,
// which Analytics' own download tracking misses (it doesn't know .dmg).
(() => {
  const key = 'dn-analytics';
  const stored = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const store = (value) => { try { localStorage.setItem(key, value); } catch {} };

  let banner;
  function ask() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookies');
    banner.innerHTML = `
      <p>May we count your visit? With your OK, Google Analytics sets cookies so we can see how many people
        visit and download DynamicNotch. <a href="privacy.html#website">More</a></p>
      <div class="consent-buttons">
        <button class="button" data-choice="denied">Decline</button>
        <button class="button primary" data-choice="granted">Accept</button>
      </div>`;
    banner.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]')?.dataset.choice;
      if (!choice) return;
      store(choice);
      gtag('consent', 'update', { analytics_storage: choice });
      banner.remove();
      banner = null;
    });
    document.body.append(banner);
  }

  if (!stored()) ask();

  // "Cookie settings" in each page's footer.
  const footer = document.querySelector('footer');
  if (footer) {
    const settings = document.createElement('p');
    settings.innerHTML = '<a href="privacy.html">Privacy Policy</a> · <button class="link" type="button">Cookie settings</button>';
    settings.querySelector('button').addEventListener('click', ask);
    footer.querySelector('a[href="privacy.html"]')?.closest('p')?.remove();
    footer.append(settings);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href$=".dmg"]');
    if (!link) return;
    gtag('event', 'file_download', {
      file_name: link.pathname.split('/').pop(),
      file_extension: 'dmg',
      link_url: link.href,
      link_text: link.textContent.trim(),
    });
  });
})();
