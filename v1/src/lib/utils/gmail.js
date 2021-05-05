'use strict';

var isFirefox = typeof require !== 'undefined';
if (isFirefox) {
  var app = require('../wrapper/firefox/app');
  var config = require('../config');
  var render = require('./render');
}

var gmail = typeof exports === 'undefined' ? {} : exports;

gmail.body = (function () {
  var iks = {}, contents = {};

  function getIK (url) {
    if (iks[url]) {
      return app.Promise.resolve(iks[url]);
    }
    return new app.get(url).then(function (req) {
      var tmp = /var GLOBALS\=\[(?:([^\,]*)\,){10}/.exec(req.responseText || '');
      var ik = tmp && tmp.length > 1 ? tmp[1].replace(/[\"\']/g, '') : null;
      if (ik) {
        iks[url] = ik;
        return ik;
      }
      else {
        return Error(
          'gmail.js -> body -> getIK -> ' +
          'Error at resolving user\'s static ID. Please switch back to the summary mode.'
        );
      }
    });
  }

  return function (link) {
    link = link.replace('http://', 'https://');
    if (contents[link]) {
      return app.Promise.resolve(contents[link]);
    }

    var url = /[^\?]*/.exec(link)[0] + '/?ibxr=0';
    var thread = /message\_id\=([^\&]*)/.exec(link);

    if (!thread || !thread.length) {
      return app.Promise.reject(Error(
        'gmail.js -> body -> Error at resolving thread. Please switch back to the summary mode.'
      ));
    }
    return getIK(url).then(function (ik) {
      return new app.get(url + '?ui=2&ik=' + ik + '&view=pt&dsqt=1&search=all&msg=' + thread[1])
      .then(function (req) {
        if (req.status !== 200) {
          return '...';
        }
        var body = render[config.popup.display ? 'getHTMLText' : 'getPlainText'](req, url, link);
        contents[link] = body;
        return body;
      });
    });
  };
})();

/**
 * Send archive, mark as read, mark as unread, and trash commands to Gmail server
 * @param {String} link, xml.link address
 * @param {String} cmd: rd, ur, rc_%5Ei, tr, sp
 */
gmail.action = (function () {
  function getAt2 (url) {
    return new app.get(url + 'h/' + Math.ceil(1000000 * Math.random())).then (function (req) {
      if (!req) {
        return Error('gmail.js -> action -> getAt2 -> server response is empty.');
      }
      if (req.status === 200) {
        var tmp = /at\=([^\"\&]*)/.exec(req.responseText);
        return tmp && tmp.length > 1 ? tmp[1] : null;
      }
      else {
        return Error('gmail.js -> action -> getAt2 -> got status of ' + req.status);
      }
    });
  }
  function getAt (url) {
    return new app.get(url).then(function (req) {
      if (!req) {
        return Error('gmail.js -> action -> getAt -> server response is empty.');
      }
      if (req.status === 200) {
        var tmp = /GM_ACTION_TOKEN\=\"([^\"]*)\"/.exec(req.responseText);
        if (tmp && tmp.length) {
          return tmp[1];
        }
        else {
          return getAt2(url);
        }
      }
      else {
        return Error('gmail.js -> action -> getAt -> got status of ' + req.status);
      }
    });
  }

  function sendCmd (url, at, threads, cmd) {
    if (cmd === 'rc_%5Ei' && config.email.doReadOnArchive) {
      sendCmd(url, at, threads, 'rd');
    }
    var u = url + '&at=' + at + '&act=' + cmd.replace('rd-all', 'rd');
    u += '&t=' + threads.join('&t=');

    return new app.get(u).then(function (req) {
      if (!req) {
        return Error('gmail.js -> action -> sendCmd -> server response is empty.');
      }
      if (req.status === 200) {
        return true;
      }
      return Error('gmail.js -> action -> sendCmd -> got status of ' + req.status);
    });
  }

  return function (links, cmd) {
    links = typeof(links) === 'string' ? [links] : links;
    var url = /[^\?]*/.exec(links[0])[0] + '/?ibxr=0';
    return getAt(url).then(function (at) {
      if (at instanceof Error) {
        return app.Promise.reject(at);
      }
      var threads = [];
      links.forEach(function (link) {
        var thread = /message\_id\=([^\&]*)/.exec(link);
        if (thread && thread.length) {
          threads.push(thread[1]);
        }
      });
      if (threads.length) {
        return sendCmd(url, at, threads, cmd);
      }
      return app.Promise.reject(Error('gmail.js -> action -> Error at resolving thread.'));
    });
  };
})();
