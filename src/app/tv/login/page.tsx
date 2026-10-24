import { headers } from 'next/headers';
import TVLayout from '@/components/tv/TVLayout';
import { createQrLoginSession } from '@/lib/qr-login/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function TVLoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirect = searchParams?.redirect || '/tv';

  let qrImg = '';
  let token = '';

  try {
    const session = await createQrLoginSession();
    token = session.token;
    const headerList = headers();
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'tv.aitalo.com';
    const proto = headerList.get('x-forwarded-proto') || 'https';
    const qrUrl = `${proto}://${host}/qr-login?token=${encodeURIComponent(token)}`;
    qrImg = `/api/auth/qr/image?data=${encodeURIComponent(qrUrl)}`;
  } catch (err) {
    console.error('Failed to create server-side QR session:', err);
  }

  return (
    <TVLayout showNav={false}>
      <section style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: '960px', margin: '20px auto 0 auto', padding: '32px 40px', borderRadius: '32px', backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
        <div style={{ flex: 1, paddingRight: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', padding: '6px 18px', fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
            📱 手机扫码 · 电视自动登录
          </div>
          <h1 style={{ marginTop: '20px', fontSize: '46px', fontWeight: 900, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.2 }}>扫码登录</h1>
          <p style={{ marginTop: '16px', fontSize: '20px', lineHeight: 1.6, color: '#94a3b8' }}>
            用已登录的手机浏览器扫描右侧二维码，在手机上点击确认后，电视将自动登录进入。
          </p>
          <p id='qr-status-text' style={{ marginTop: '24px', fontSize: '22px', fontWeight: 'bold', color: '#fda4af' }}>
            请使用手机扫码
          </p>
        </div>
        <div style={{ width: '270px', flexShrink: 0, borderRadius: '24px', backgroundColor: '#ffffff', padding: '16px', textAlign: 'center', color: '#000000', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          {qrImg ? (
            <img src={qrImg} alt='扫码登录二维码' style={{ width: '238px', height: '238px', margin: '0 auto', display: 'block' }} />
          ) : (
            <div style={{ height: '238px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
              生成二维码失败，请刷新
            </div>
          )}
          <div id='qr-countdown' style={{ marginTop: '12px', fontSize: '17px', fontWeight: 900, color: '#334155' }}>剩余 120 秒</div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var token = ${JSON.stringify(token)};
  var redirect = ${JSON.stringify(redirect)};
  if (!token) return;

  var statusEl = document.getElementById('qr-status-text');
  var timerEl = document.getElementById('qr-countdown');
  var left = 120;

  var countTimer = setInterval(function() {
    left--;
    if (timerEl) {
      timerEl.innerText = left > 0 ? ('剩余 ' + left + ' 秒') : '二维码已过期，正在刷新...';
    }
    if (left <= 0) {
      clearInterval(countTimer);
      window.location.reload();
    }
  }, 1000);

  var pollTimer = setInterval(function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/auth/qr/status?token=' + encodeURIComponent(token), true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.status === 'scanned') {
            if (statusEl) statusEl.innerText = '已扫码，请在手机上确认';
          } else if (data.status === 'confirmed') {
            if (statusEl) statusEl.innerText = '登录成功，正在进入电视端...';
            clearInterval(pollTimer);
            clearInterval(countTimer);
            window.location.replace(redirect);
          } else if (data.status === 'expired' || data.status === 'cancelled') {
            if (statusEl) statusEl.innerText = '二维码已失效，正在刷新...';
            clearInterval(pollTimer);
            clearInterval(countTimer);
            window.location.reload();
          }
        } catch(e) {}
      }
    };
    xhr.send();
  }, 2000);
})();
          `,
        }}
      />
    </TVLayout>
  );
}
