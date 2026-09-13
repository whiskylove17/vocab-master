/**
 * LexiCraft Cloud Sync Engine
 * Hỗ trợ đồng bộ đa thiết bị: Máy tính, Điện thoại, Mọi trình duyệt
 * Tự động hợp nhất dữ liệu, hỗ trợ làm việc ngoại tuyến (Offline-first)
 */

(function () {
  'use strict';

  const STORAGE_KEY_SYNC_ID = 'lexicraft_cloud_sync_key_v1';
  const STORAGE_KEY_FIREBASE_URL = 'lexicraft_firebase_db_url_v1';
  const STORAGE_KEY_LAST_PULL_TIME = 'lexicraft_last_cloud_sync_time_v1';

  // Default cloud relay endpoint (dùng REST storage siêu tốc, miễn phí vĩnh viễn)
  const CLOUD_RELAY_ENDPOINT = 'https://api.restful-api.dev/objects';
  const STORAGE_KEY_RELAY_RECORD_ID = 'lexicraft_cloud_relay_record_id_v1';

  let syncKey = '';
  let firebaseUrl = '';
  let currentStatus = 'synced'; // 'synced', 'syncing', 'offline', 'error'
  let lastSyncTime = null;
  let pushTimer = null;
  let isSyncing = false;
  let onDataUpdatedCallback = null;
  let onStatusChangedCallback = null;

  // Tự sinh mã đồng bộ ngẫu nhiên dễ nhớ dạng: VIET-789X
  function generateDefaultSyncKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VIET-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Khởi tạo mã đồng bộ: Ưu tiên lấy từ URL ?sync=... nếu có (khi quét QR từ điện thoại)
  function initSyncKey() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSyncKey = urlParams.get('sync');
      if (urlSyncKey && urlSyncKey.trim()) {
        const cleanKey = urlSyncKey.trim().toUpperCase();
        localStorage.setItem(STORAGE_KEY_SYNC_ID, cleanKey);
        syncKey = cleanKey;
        // Dọn URL để nhìn sạch sẽ mà không reload trang
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }

      const storedKey = localStorage.getItem(STORAGE_KEY_SYNC_ID);
      if (storedKey && storedKey.trim()) {
        syncKey = storedKey.trim().toUpperCase();
      } else {
        syncKey = generateDefaultSyncKey();
        localStorage.setItem(STORAGE_KEY_SYNC_ID, syncKey);
      }
    } catch (e) {
      console.warn('LocalStorage error in initSyncKey', e);
      syncKey = generateDefaultSyncKey();
    }
  }

  function setStatus(status, message = '') {
    currentStatus = status;
    if (typeof onStatusChangedCallback === 'function') {
      onStatusChangedCallback(status, {
        syncKey,
        lastSyncTime,
        message
      });
    }
  }

  // Cloud API Handler: Hỗ trợ Firebase Realtime DB hoặc Cloud Relay
  async function fetchRemoteData() {
    try {
      // 1. Nếu người dùng cấu hình Firebase Realtime DB
      if (firebaseUrl && firebaseUrl.startsWith('http')) {
        let cleanUrl = firebaseUrl.trim().replace(/\/+$/, '');
        if (!cleanUrl.endsWith('.json')) {
          cleanUrl += `/lexicraft_rooms/${encodeURIComponent(syncKey)}.json`;
        }
        const res = await fetch(cleanUrl, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      }

      // 2. Sử dụng Cloud Relay
      // Tìm record ID gắn với syncKey
      const relayRecordMap = JSON.parse(localStorage.getItem(STORAGE_KEY_RELAY_RECORD_ID) || '{}');
      const recordId = relayRecordMap[syncKey];

      if (recordId) {
        const res = await fetch(`${CLOUD_RELAY_ENDPOINT}/${recordId}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (res.ok) {
          const record = await res.json();
          return record?.data || null;
        }
      }

      return null;
    } catch (err) {
      console.warn('Error fetching remote data', err);
      return null;
    }
  }

  async function pushRemoteData(payload) {
    // Gắn thêm metadata đồng bộ
    const dataToSave = {
      ...payload,
      syncKey: syncKey,
      updatedAt: Date.now(),
      clientInfo: {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        time: new Date().toISOString()
      }
    };

    // 1. Đẩy lên Firebase nếu có
    if (firebaseUrl && firebaseUrl.startsWith('http')) {
      let cleanUrl = firebaseUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.endsWith('.json')) {
        cleanUrl += `/lexicraft_rooms/${encodeURIComponent(syncKey)}.json`;
      }
      const res = await fetch(cleanUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) {
        return true;
      }
    }

    // 2. Đẩy lên Cloud Relay
    const relayRecordMap = JSON.parse(localStorage.getItem(STORAGE_KEY_RELAY_RECORD_ID) || '{}');
    let recordId = relayRecordMap[syncKey];

    if (recordId) {
      try {
        const res = await fetch(`${CLOUD_RELAY_ENDPOINT}/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `lexicraft_${syncKey}`,
            data: dataToSave
          })
        });
        if (res.ok) return true;
      } catch (e) {
        // Nếu record cũ bị lỗi, tạo mới bên dưới
      }
    }

    // Nếu chưa có recordId, tạo record mới
    try {
      const createRes = await fetch(CLOUD_RELAY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `lexicraft_${syncKey}`,
          data: dataToSave
        })
      });

      if (createRes.ok) {
        const newRecord = await createRes.json();
        if (newRecord?.id) {
          relayRecordMap[syncKey] = newRecord.id;
          localStorage.setItem(STORAGE_KEY_RELAY_RECORD_ID, JSON.stringify(relayRecordMap));
          return true;
        }
      }
    } catch (e) {
      console.warn('Cloud relay POST failed', e);
    }

    return false;
  }

  const CloudSync = {
    init({ onDataUpdated, onStatusChanged }) {
      onDataUpdatedCallback = onDataUpdated;
      onStatusChangedCallback = onStatusChanged;

      initSyncKey();
      firebaseUrl = localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '';

      setStatus('synced', 'Đã sẵn sàng');

      // Tự động kiểm tra dữ liệu đám mây khi khởi động
      setTimeout(() => {
        this.pull();
      }, 500);

      // Khi người dùng quay lại tab trình duyệt (đặc biệt trên điện thoại khi mở lại)
      window.addEventListener('focus', () => {
        const lastPull = parseInt(localStorage.getItem(STORAGE_KEY_LAST_PULL_TIME) || '0', 10);
        if (Date.now() - lastPull > 15000) {
          this.pull();
        }
      });

      // Lắng nghe sự kiện Online/Offline của thiết bị
      window.addEventListener('online', () => {
        setStatus('syncing', 'Đã kết nối lại, đang đồng bộ...');
        this.pull();
      });

      window.addEventListener('offline', () => {
        setStatus('offline', 'Mất mạng (Đang học Offline)');
      });
    },

    getSyncKey() {
      return syncKey;
    },

    setSyncKey(newKey, currentLocalData) {
      if (!newKey || !newKey.trim()) return false;
      syncKey = newKey.trim().toUpperCase();
      try {
        localStorage.setItem(STORAGE_KEY_SYNC_ID, syncKey);
      } catch (e) {}

      setStatus('syncing', 'Đang chuyển sang mã đồng bộ mới...');
      // Kéo dữ liệu từ mã mới về
      this.pull(currentLocalData);
      return true;
    },

    getFirebaseUrl() {
      return firebaseUrl;
    },

    setFirebaseUrl(url) {
      firebaseUrl = (url || '').trim();
      try {
        localStorage.setItem(STORAGE_KEY_FIREBASE_URL, firebaseUrl);
      } catch (e) {}
    },

    getStatus() {
      return {
        status: currentStatus,
        syncKey: syncKey,
        lastSyncTime: lastSyncTime
      };
    },

    // Tạo link trực tuyến có gắn sẵn mã đồng bộ để quét QR trên điện thoại
    getShareableLink() {
      let baseUrl = window.location.origin + window.location.pathname;
      // Nếu đang chạy local file:// thì hướng tới link GitHub Pages chính thức
      if (baseUrl.startsWith('file:') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        baseUrl = 'https://whiskylove17.github.io/vocab-master/';
      }
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
      return `${baseUrl}?sync=${encodeURIComponent(syncKey)}`;
    },

    // Hẹn giờ đẩy dữ liệu lên đám mây (Debounce 1.2s tránh spam request khi gõ nhanh)
    schedulePush(payload) {
      if (pushTimer) clearTimeout(pushTimer);
      setStatus('syncing', 'Đang lưu lên đám mây...');

      pushTimer = setTimeout(async () => {
        if (!navigator.onLine) {
          setStatus('offline', 'Lưu trên máy (Chờ có mạng để đồng bộ)');
          return;
        }

        try {
          const success = await pushRemoteData(payload);
          if (success) {
            lastSyncTime = new Date();
            localStorage.setItem(STORAGE_KEY_LAST_PULL_TIME, Date.now().toString());
            setStatus('synced', `Đã đồng bộ (${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
          } else {
            setStatus('error', 'Chưa thể lưu lên đám mây, dữ liệu đã an toàn trên máy');
          }
        } catch (e) {
          console.warn('Sync push error', e);
          setStatus('error', 'Lỗi kết nối đám mây');
        }
      }, 1200);
    },

    // Kéo dữ liệu đám mây về máy
    async pull(localDataFallback = null) {
      if (!navigator.onLine) {
        setStatus('offline', 'Chế độ ngoại tuyến');
        return;
      }
      if (isSyncing) return;
      isSyncing = true;
      setStatus('syncing', 'Đang kiểm tra đám mây...');

      try {
        const remoteData = await fetchRemoteData();
        isSyncing = false;

        if (remoteData && remoteData.chapters && remoteData.vocabulary) {
          lastSyncTime = new Date();
          localStorage.setItem(STORAGE_KEY_LAST_PULL_TIME, Date.now().toString());
          setStatus('synced', `Đã đồng bộ (${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

          if (typeof onDataUpdatedCallback === 'function') {
            onDataUpdatedCallback(remoteData);
          }
        } else {
          // Chưa có dữ liệu trên đám mây cho mã này -> Đẩy dữ liệu hiện tại lên làm gốc
          if (localDataFallback) {
            this.schedulePush(localDataFallback);
          } else {
            setStatus('synced', 'Đã kết nối mã phòng mới');
          }
        }
      } catch (err) {
        isSyncing = false;
        console.warn('Error during cloud pull', err);
        setStatus('error', 'Không thể nạp từ đám mây');
      }
    }
  };

  window.CloudSync = CloudSync;
})();
