const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function storePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

exports.load = function (name, fallback = null) {
  try { return JSON.parse(fs.readFileSync(storePath(name), 'utf8')); }
  catch { return fallback; }
};

exports.save = function (name, data) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(storePath(name), JSON.stringify(data));
};
