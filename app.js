'use strict';

module.exports = app => {
  // if true, then don't need to wait
  if (app.config.hotReload.fastReady) process.nextTick(() => app.ready(true));
};
