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
      <section className='mx-auto grid max-w-6xl grid-cols-[1fr_430px] gap-10 rounded-[42px] border border-white/10 bg-slate-950/75 p-12 shadow-2xl shadow-black/60'>
        <div className='flex flex-col justify-center'>
          <div className='inline-flex w-fit items-center gap-3 rounded-full bg-rose-600 px-5 py-2 text-xl font-bold text-white'>
            📱 手机确认 · 电视自动登录
          </div>
          <h1 className='mt-7 text-7xl font-black tracking-tight'>扫码登录</h1>
          <p className='mt-6 max-w-2xl text-3xl leading-relaxed text-slate-300'>
            用已登录的手机浏览器扫描右侧二维码，在手机上确认后，电视端会自动进入。
          </p>
          <p id='qr-status-text' className='mt-8 text-2xl font-bold text-rose-300'>
            请使用手机扫码登录
          </p>
        </div>
        <div className='rounded-[36px] border border-white/10 bg-white p-7 text-center text-black shadow-2xl shadow-black/60'>
          {qrImg ? (
            <img src={qrImg} alt='扫码登录二维码' className='mx-auto h-[360px] w-[360px]' />
          ) : (
            <div className='flex h-[360px] items-center justify-center text-2xl font-bold text-red-500'>
              生成二维码失败，请刷新
            </div>
          )}
          <div id='qr-countdown' className='mt-5 text-2xl font-black'>剩余 120 秒</div>
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
