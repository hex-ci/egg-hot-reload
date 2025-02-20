'use strict';

const path = require('path');
const debounce = require('debounce');
const multimatch = require('multimatch');
const rimraf = require('mz-modules/rimraf');
const fs = require('mz/fs');

module.exports = agent => {
  // clean all timing json
  agent.beforeStart(async () => {
    const rundir = agent.config.rundir;
    const files = await fs.readdir(rundir);

    for (const file of files) {
      if (!/^(agent|application)_timing/.test(file)) {
        continue;
      }

      await rimraf(path.join(agent.config.rundir, file));
    }
  });

  // single process mode don't watch and reload
  if (agent.options && agent.options.mode === 'single') {
    return;
  }

  const logger = agent.logger;
  const baseDir = agent.config.baseDir;
  const config = agent.config.hotReload;

  let watchDirs = config.overrideDefault ? [] : [
    'app',
    'config',
    'app.js',
  ];

  watchDirs = watchDirs.concat(config.watchDirs).map(dir => path.resolve(baseDir, dir));

  let ignoreReloadFileDirs = config.overrideIgnore ? [] : [
    'app/views',
    'app/view',
    'app/assets',
    'app/public',
    'app/web',
  ];

  ignoreReloadFileDirs = ignoreReloadFileDirs.concat(config.ignoreDirs).map(dir => path.resolve(baseDir, dir));

  const reloadFile = debounce(function(info) {
    logger.warn(`[agent:hotReload] reload worker because ${info.path} ${info.event}`);

    process.send({
      to: 'master',
      action: 'reload-worker',
    });
  }, 200);


  // watch dirs to reload worker, will debounce 200ms
  agent.watcher.watch(watchDirs, reloadWorker);

  /**
   * reload app worker:
   *   [AgentWorker] - on file change
   *    |-> emit reload-worker
   *   [Master] - receive reload-worker event
   *    |-> TODO: Mark worker will die
   *    |-> Fork new worker
   *      |-> kill old worker
   *
   * @param {Object} info - changed fileInfo
   */
  function reloadWorker(info) {
    if (isAssetsDir(info.path) || info.isDirectory) {
      return;
    }

    // don't reload if don't match
    if (config.reloadPattern && multimatch(info.path, config.reloadPattern).length === 0) {
      return;
    }

    reloadFile(info);
  }

  function isAssetsDir(path) {
    for (const ignorePath of ignoreReloadFileDirs) {
      if (path.startsWith(ignorePath)) {
        return true;
      }
    }
    return false;
  }
};
