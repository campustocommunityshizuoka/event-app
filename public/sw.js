// public/sw.js
// Version 1.0.1

self.addEventListener('push', function (event) {

  console.log('Push received!'); // スマホをPCに繋いでいればログで見えます
  
  const promise = self.registration.pushManager.getSubscription()
    .then(subscription => {
      if (!subscription) throw new Error('No subscription found');
      
      const endpoint = encodeURIComponent(subscription.endpoint);
      // ★絶対パスで指定することを確認
      return fetch(`/api/push/get-message?endpoint=${endpoint}`);
    })
  // ...（以下、
    .then(res => res.json())
    .then(data => {
      // 3. APIから届いたタイトルと本文を表示
      return self.registration.showNotification(data.title || 'しずおかコネクト', {
        body: data.body || '新着のお知らせがあります', // データがない時の予備
        icon: '/logo.png',
        badge: '/logo.png',
      });
    })
    .catch(err => {
      console.error('Push fetch error:', err);
    });

  event.waitUntil(promise);
});