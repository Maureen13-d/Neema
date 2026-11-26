"""End-to-end check of the Neema demo chain (scenarios A-D, SOS, CHP reply, acknowledgement).

Usage: pnpm dev, then  python3 scripts/e2e_demo_chain.py [http://localhost:5173]
Needs: pip install playwright && playwright install chromium (or set CHROME_PATH).
"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
SHOTS = os.environ.get("NEEMA_E2E_SHOTS", "/tmp")
INIT = """
localStorage.setItem('neema.onboarding.v1', JSON.stringify({orientationDone:true, consentDone:true}));
localStorage.setItem('neema.lang.v1', 'sw');
window.__spoken = [];
const realSpeak = window.speechSynthesis && window.speechSynthesis.speak.bind(window.speechSynthesis);
if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); };
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="sms:"]');
  if (a) { e.preventDefault(); window.__sms = (window.__sms||[]).concat(a.getAttribute('href')); }
}, true);
"""

def alerts_count(page):
    return page.evaluate("""() => new Promise((res) => {
      const r = indexedDB.open('neema-mama-passport');
      r.onsuccess = () => { const tx = r.result.transaction('alerts'); const c = tx.objectStore('alerts').count();
        c.onsuccess = () => res(c.result); };
    })""")

def level_on_alert(page):
    return page.locator('.status-orb').get_attribute('data-level')

def play(page, label):
    page.goto(f"{BASE}/settings")
    page.get_by_text(label, exact=False).first.click()

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

with sync_playwright() as p:
    chrome = os.environ.get("CHROME_PATH")
    browser = p.chromium.launch(**({"executable_path": chrome} if chrome else {}), args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 412, "height": 915}, geolocation={"latitude": -1.2833, "longitude": 36.7500},
                              permissions=["geolocation"], locale="sw-KE", timezone_id="Africa/Nairobi")
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/home")
    page.wait_for_timeout(1500)

    # Scenario C: emergency
    play(page, "C · Dharura")
    page.wait_for_url("**/alert")
    page.wait_for_timeout(1500)
    check("C → RED", level_on_alert(page) == "RED", level_on_alert(page))
    reason = page.get_by_test_id("alert-reason").inner_text()
    check("C reason in plain Swahili", "shinikizo la damu juu sana" in reason, reason)
    sms_buttons = page.locator(".sms-list a")
    check("C SMS to CHP and family (2 links)", sms_buttons.count() == 2, str(sms_buttons.count()))
    href = sms_buttons.first.get_attribute("href") or ""
    from urllib.parse import unquote
    body = unquote(href)
    check("C SMS body has plain reason + location", "shinikizo la damu juu sana" in body and "mlat" in body and "bp_" not in body, body[:160])
    spoken = page.evaluate("window.__spoken")
    check("C spoke Swahili instruction", any("Nenda kituo cha afya sasa" in s for s in spoken), str(spoken[-1:]))
    page.screenshot(path=f"{SHOTS}/c_alert.png", full_page=True)
    sms_buttons.first.click(force=True)
    page.wait_for_timeout(7000)
    check("C scripted CHP reply 'Nakuja'", page.locator(".chp-reply").count() == 1 and "Nakuja" in page.locator(".chp-reply").inner_text())
    page.screenshot(path=f"{SHOTS}/c_reply.png", full_page=True)
    n_before = alerts_count(page)
    page.get_by_text("CHP wangu amejibu").click()
    page.wait_for_url("**/home")
    page.wait_for_timeout(4000)
    n_after = alerts_count(page)
    check("C ack does not re-raise a new alert", n_after == n_before, f"{n_before}->{n_after}")
    check("C home after ack shows confirmed RED action", page.get_by_text("Ona hatua", exact=True).count() >= 1)

    # Scenario D: postpartum fever + fast pulse
    play(page, "D · Homa")
    page.wait_for_url("**/alert")
    page.wait_for_timeout(1500)
    check("D → RED", level_on_alert(page) == "RED", level_on_alert(page))
    reason = page.get_by_test_id("alert-reason").inner_text()
    check("D reason fever + fast pulse", "homa na mapigo ya moyo ya haraka" in reason, reason)
    page.screenshot(path=f"{SHOTS}/d_alert.png", full_page=True)
    page.get_by_text("Niko njiani").click()
    page.wait_for_url("**/home")

    # Scenario A then B
    play(page, "A · Usiku mwema")
    page.wait_for_url("**/home")
    page.wait_for_timeout(1500)
    lvl = page.locator(".hero-card").get_attribute("data-level")
    check("A → GREEN", lvl == "GREEN", lvl)
    play(page, "B1 · Onyo")
    page.wait_for_url("**/home")
    page.wait_for_timeout(1500)
    lvl = page.locator(".hero-card").get_attribute("data-level")
    check("B1 → YELLOW", lvl == "YELLOW", lvl)
    page.goto(f"{BASE}/alert")
    page.wait_for_timeout(800)
    check("B1 quiet heads-up to CHP only", page.locator(".sms-list a").count() == 1, str(page.locator(".sms-list a").count()))
    page.screenshot(path=f"{SHOTS}/b1_alert.png", full_page=True)
    play(page, "B2 · Pima tena")
    page.wait_for_url("**/home")
    page.wait_for_timeout(1500)
    lvl = page.locator(".hero-card").get_attribute("data-level")
    check("B2 recheck → GREEN", lvl == "GREEN", lvl)

    # App SOS
    page.goto(f"{BASE}/settings")
    page.get_by_text("Anza upya").click()
    page.wait_for_timeout(1500)
    page.goto(f"{BASE}/home")
    page.wait_for_timeout(1500)
    btn = page.get_by_test_id("sos-button")
    box = btn.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down(); page.wait_for_timeout(600); page.mouse.up()
    page.wait_for_timeout(800)
    check("SOS short tap does nothing", "/home" in page.url)
    page.mouse.down(); page.wait_for_timeout(2400); page.mouse.up()
    page.wait_for_url("**/alert", timeout=5000)
    page.wait_for_timeout(1500)
    check("SOS hold → RED", level_on_alert(page) == "RED", level_on_alert(page))
    reason = page.get_by_test_id("alert-reason").inner_text()
    check("SOS reason", "SOS" in reason, reason)
    page.get_by_text("Niko njiani").click()
    page.wait_for_url("**/home")
    page.wait_for_timeout(6000)  # simulator SOS flag released after 3 s
    lvl = page.locator(".hero-card").get_attribute("data-level")
    check("After ack, RED clears (no SOS latch)", lvl != "RED", lvl)
    page.screenshot(path=f"{SHOTS}/home_after.png", full_page=True)

    check("No page errors", not errors, "; ".join(errors)[:300])
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
