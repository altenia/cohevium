
var fs = require('fs');

/***************************************************************************
 * The class FileRenderer
 ****************************************************************************/
module.exports.MenuRenderer = function(logger, appSettings, moduleConfig) {

    this.logger = logger;
    
    this.appSettings = appSettings;
    this.moduleConfig = moduleConfig;

    this.render = function(request, callback) {
        var contentData = '<ul>';
        
        for(var i=0; i < moduleConfig.menu_items.length; ++i) {
            var menuItem = moduleConfig.menu_items[i];
            if (menuItem.type == 'url') {
                contentData += '<li><a href="' + menuItem.ref + '">' + menuItem.title + '</a></li>';
            }
        }
        contentData += '</ul>';
console.log(contentData);

        callback(null, contentData);
    };
};