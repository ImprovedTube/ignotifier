'use strict';

var count = 5;
var timer = document.getElementById('timer');
var a = document.getElementById('a');
var id;

var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

if (isChrome) {
  id = window.setInterval(() => {
    count -= 1;
    timer.textContent = '(' + count + ')';
    if (count === 0) {
      a.click();
    }
  }, 1000);
}
else {
  window.location.replace(chrome.runtime.getURL('/data/options/index.html'));
}

a.addEventListener('click', e => {
  e.preventDefault();

  window.clearTimeout(id);

  timer.textContent = '';

  chrome.tabs.create({
    url: chrome.runtime.getURL('/data/options/index.html')
  }, () => window.close());
});

document.getElementById('cancel').addEventListener('click', e => {
  e.preventDefault();
  window.clearTimeout(id);
  timer.textContent = '';
  e.target.parentNode.removeChild(e.target);
});
