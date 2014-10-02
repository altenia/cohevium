var fs = require('fs');
var sys = require('sys');
var childProc = require('child_process');

var utils = require('./utils');

var internals = {};

module.exports.ContentManager = function(repoDir) {

    this.repoDir = repoDir;
    if (!utils.endsWith(this.repoDir, '/')) {
        this.repoDir += '/';
    }

    this.gitArgs = ['--git-dir="' + this.repoDir + '.git"', '--work-tree="' + this.repoDir + '"'];

    /**
     * Combination of status and log
     */
    this.getInfo = function(callback) {
        that = this;
        this.status(null, function(statusErr, statusData) {
            that.log({count:1}, function(logErr, logData) {
                var repoInfo = statusData['result'] || {};
                if (logData && logData.result) {
                    repoInfo.lastCommit = logData.result.logs[0];
                }
                var err = statusErr || logErr;
                callback(err, repoInfo);
            });
        });
    };

    this.add = function(params, callback) {
        var  extraArgs = [this.repoDir];
        if (params && params.args)
        {
            extraArgs.push(params.args);
        }

        this.runGit_('add', extraArgs, callback);
    };


};


internals.outputParser = {
    
};

