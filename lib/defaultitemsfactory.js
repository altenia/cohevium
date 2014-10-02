
var fs = require('fs');
var utils = require('./utils');

/***************************************************************************
 * The class FileRenderer
 ****************************************************************************/
module.exports.DefaultItemsFactory = function(logger, appSettings) {

  /**
   * The Logger
   * @type {Logger}
   */
  this.logger = logger;
  
  /**
   * The application settings
   * @type {Object}
   */
  this.appSettings = appSettings;

  this.itemsDescription = null;

  this.init = function() {

    var descriptionPath = this.appSettings.contentBaseDir + 'cohevium-items.json';
    if(fs.existsSync(descriptionPath)) {
        var descriptionData = fs.readFileSync(descriptionPath, 'utf8');
        this.itemsDescription = JSON.parse(descriptionData);
    } else {
        throw new Error("Could not open file: " + descriptionPath);
    }
    
  };

  this.items = function(request, callback)
  {
    var itemsToReturn = [];
    that = this;

    /*
    this.itemsDescription.items.forEach(function(element, index, array){
      var module = require(element.module + '/' + element.renderer );
      var Renderer = module[element.renderer];
      var renderer = new Renderer(that.logger, that.appSettings, element.config);
      itemsToReturn[element.name] = renderer.render(request);
    });
    */
   

   // To serialize async calls
    function retrieveRepoInfoSer(idx)
    {
   console.log("---" + idx + "---" + JSON.stringify(that.itemsDescription.items));
        var element = that.itemsDescription.items[idx];
        var module = require(element.module + '/' + element.renderer );
        var Renderer = module[element.renderer];
        var renderer = new Renderer(that.logger, that.appSettings, element.config);
        renderer.render(request, function(error, result){
            if (!error) {
                itemsToReturn[element.name] = {result: result};
            } else {
                itemsToReturn[element.name] = {error: error};
            }

            if (idx < that.itemsDescription.items.length - 1) {
                retrieveRepoInfoSer(idx + 1);
            } else {
                callback(itemsToReturn);
            }
        });
    }
    if (this.itemsDescription.items.length > 0) {
        retrieveRepoInfoSer(0);
    }

  };
};