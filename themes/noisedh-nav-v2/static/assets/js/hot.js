// 定义API接口,请自己部署自己的api，不要使用我的
// 定义API接口
const primaryEndpoints = (window.CONFIG && window.CONFIG.hotApiEndpoints && Array.isArray(window.CONFIG.hotApiEndpoints))
  ? window.CONFIG.hotApiEndpoints
  : ['https://hot.noisework.cn', 'https://hot.noisedh.link'];

const apiEndpoints = {
  zhihu: '/zhihu',
  weibo: '/sina',
  bilibili: '/bilibili',
  douyin: '/douyin',
  baidu: '/tieba',
  toutiao: '/toutiao',
  v2ex: '/v2ex',
  hellogithub: '/hellogithub'
};

function notifyHotlistLayoutUpdated() {
  document.dispatchEvent(new CustomEvent('hotlist:updated'));
}

// 使用 fetch API 从不同的API端点请求数据
function fetchData(target) {
  const targetElement = document.getElementById(target);
  if (!targetElement) return;
  const updateTimeElement = targetElement.querySelector('.update-time');
  if (!updateTimeElement) return;
  updateTimeElement.textContent = '数据更新时间: 加载中...';

  const endpointPath = apiEndpoints[target];
  let currentEndpointIndex = 0; // 默认使用第一个API

  const fetchFromEndpoint = (url) => {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Data received from', url, data);
        loadData(data.data, target);
        updateTimeElement.textContent = `数据更新时间: ${new Date().toLocaleString()}`;
        saveDataToLocalStorage(target, data.data); // 保存数据到本地存储
        notifyHotlistLayoutUpdated();
      })
      .catch(error => {
        console.error('Error fetching data from', url, error);
        currentEndpointIndex++;
        if (currentEndpointIndex < primaryEndpoints.length) {
          fetchFromEndpoint(`${primaryEndpoints[currentEndpointIndex]}${endpointPath}`);
        } else {
          updateTimeElement.textContent = `数据更新时间: 错误`;
          const list = document.getElementById(target + '-list');
          const li = document.createElement('li');
          li.textContent = `Error: ${error.message}`;
          list.appendChild(li);
          notifyHotlistLayoutUpdated();
        }
      });
  };

  fetchFromEndpoint(`${primaryEndpoints[currentEndpointIndex]}${endpointPath}`);
}

function loadData(data, target) {
  const list = document.getElementById(target + '-list');
  if (!list) return;
  list.innerHTML = ''; // 清空列表
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const li = document.createElement('li');
      li.setAttribute('data-index', `${index + 1}.`);
      const url = (window.innerWidth > 768) ? item.url : item.mobileUrl || '#';
      const a = document.createElement('a');
      a.textContent = item.title || 'No title';
      a.href = url || '#';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No data received';
    list.appendChild(li);
  }
  notifyHotlistLayoutUpdated();
}

function saveDataToLocalStorage(target, data) {
  localStorage.setItem(target, JSON.stringify(data));
}

function loadFromLocalStorage(target) {
  const storedData = localStorage.getItem(target);
  if (storedData) {
    const data = JSON.parse(storedData);
    const updateTimeElement = document.getElementById(target).querySelector('.update-time');
    updateTimeElement.textContent = `数据更新时间: ${new Date().toLocaleString()}`;
    loadData(data, target);
  }
}

function refreshData(target) {
  fetchData(target);
}

// 页面加载时初始化数据
document.addEventListener('DOMContentLoaded', () => {
  const targets = Object.keys(apiEndpoints);
  targets.forEach(target => {
    loadFromLocalStorage(target);
  });
  const scheduleFetch = function (target, delay) {
    window.setTimeout(function () {
      if (document.visibilityState !== 'visible') return;
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () {
          fetchData(target);
        }, { timeout: 1200 });
        return;
      }
      fetchData(target);
    }, delay);
  };
  targets.forEach((target, index) => {
    scheduleFetch(target, index * 450);
  });
});

// 每小时自动刷新热榜数据
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  Object.keys(apiEndpoints).forEach(target => {
    fetchData(target);
  });
}, 3600000);
