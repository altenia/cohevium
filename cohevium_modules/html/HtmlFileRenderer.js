
var fs = require('fs');

/***************************************************************************
 * The class FileRenderer
 ****************************************************************************/
module.exports.HtmlFileRenderer = function(logger, appSettings, moduleConfig) {

    this.logger = logger;
    
    this.appSettings = appSettings;
    this.moduleConfig = moduleConfig;

    this.render = function(request, callback) {
        var relativePath = request.params.path;

        var contentPath = this.appSettings.contentBaseDir + relativePath;

        if(fs.existsSync(contentPath)) {
            var contentData = fs.readFileSync(contentPath, 'utf8');
            callback(null, contentData);
        } else {
            callback(new Error("File does not exists"), null);
        }
    };
};