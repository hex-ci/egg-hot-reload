'use strict';

const path = require('path');

module.exports = appInfo => {
  return {
    keys: 'foo,bar',
    hotReload: {
      watchDirs: [
        path.join(appInfo.baseDir, 'lib'),
      ],
    },
  }
};
