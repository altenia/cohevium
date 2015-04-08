
var fs = require('fs');
var utils = require('./utils');

var internals = {};

/***************************************************************************
 * The class DefaultContentLoader
 ****************************************************************************/
internals.DefaultContentLoader = function(logger, appSettings) {

    /**
    * The Logger
    * @type {Logger}
    */
    this.logger_ = logger;

    /**
    * The application settings
    * @type {Object}
    */
    this.appSettings_ = appSettings;

    // @todo - change name to config_
    this.config_ = null;

    this.itemDescriptions_ = {};

    var self = this;

    this.loadConfig = function(configPath)
    {
        var configData = fs.readFileSync(configPath, 'utf8');
        this.config_ = JSON.parse(configData);

        this.itemDescriptions_ = this.config_.items;
    }

    this.init = function()
    {
        var configPath = this.appSettings_.contentBaseDir + 'cohevium-items.json';
        if(fs.existsSync(configPath)) {
            this.loadConfig(configPath);
        } else {
            throw new Error("Could not open config_ file: " + configPath);
        }

        fs.watch(configPath, function(event, filename){
            try {
                self.loadConfig(configPath);
                self.logger_.info({data: self.config_}, "Config file re-loaded.");
            } catch (e) {
                self.logger_.error({file: configPath}, "Failed to reload config_ file.");
            }
        });

    };

    /**
     * Obtains the theme that matches the path
     */
    this.getTheme = function(path)
    {
        var common_items = this.config_.theme.common_items;
        var pathSettings = this.config_.theme.path_prefixes;

        var pathSetting;
        for(var key in pathSettings)
        {
            if (pathSettings.hasOwnProperty(key)) {
                if (utils.startsWith(path, key)) {
                    pathSetting = utils.jsonClone(pathSettings[key]);
                    if (!pathSetting.items) {
                        pathSetting.items = [];
                    }
                    // Merge the path specific items with the common items
                    if (common_items && common_items.length > 0) {
                        pathSetting.items.concat(common_items);
                    }
                    return pathSetting;
                }
            }
        }
        pathSetting = {
            items: common_items,
            template: this.config_.theme.default_template
        }
        return pathSetting;
    }

    this.load = function(request, callback)
    {
        var renderedItems = [];
        var self = this;

        var theme = this.getTheme(request.params.path);

        // To serialize async calls
        function renderItemsSer(idx)
        {
            var itemDescr = self.itemDescriptions_[theme.items[idx]];
            var module = require(self.appSettings_.modulesBaseDir + '/' + itemDescr.module + '/' + itemDescr.renderer );
            var Renderer = module[itemDescr.renderer];
            var renderer = new Renderer(self.logger_, self.appSettings_, itemDescr.config);
            renderer.render(request, function(error, result){
                if (!error) {
                    renderedItems[itemDescr.name] = {result: result};
                } else {
                    renderedItems[itemDescr.name] = {error: error};
                }

                if (idx < theme.items.length - 1) {
                    renderItemsSer(idx + 1);
                } else {
                    var themeInstance = { 
                        appInfo: self.config_.appInfo,
                        template: theme.template, 
                        items: renderedItems
                    };
                    callback(themeInstance);
                }
            });
        }
        if (theme.items.length > 0) {
            renderItemsSer(0);
        }

    };
};

module.exports.DefaultContentLoader = internals.DefaultContentLoader;