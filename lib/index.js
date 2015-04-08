// Load modules
var os = require('os');
var fs = require('fs');
var path = require('path');
var Hoek = require('hoek');
var Handlebars = require('handlebars');

var utils = require('./utils');
var FileUtil = require('./fileutil').FileUtil;
var ContentLoader = require('./defaultcontentloader').DefaultContentLoader;

var REPODIUM_VER = "0.0.1+20141001";

var CONTENT_PATH = '/content';


// Declare internals
var internals = {
    defaults: {
        // THe directory where the modules
        modulesBaseDir: path.join(__dirname, '..', 'cohevium_modules'),

        urlPathPrefix: '/cohevium',
        contentUrlPath: CONTENT_PATH,

        basePath: path.join(__dirname, '..', 'templates'),
        publicPath: path.join(__dirname, '..', 'public'),
        helpersPath: path.join(__dirname, '..', 'templates', 'helpers'),
        partialsPath: path.join(__dirname, '..', 'templates'),
        
        indexTemplate: 'index',
        routeTemplate: 'route',
    }
};


/**
 * Route endpoints:
 * List of repos: /cohevium/repos (GET)
 * New Repo     : /cohevium/repos (POST)
 * Repo status  : /cohevium/repos/{repo_name}/status (GET)
 * Repo command : /cohevium/repos/{repo_name}/command (POST)
 */
exports.register = function(plugin, options, next) {
    
    console.log(JSON.stringify(options));

    var logger_ = utils.getLogger('cohevium', options['log']);

	var appSettings_ = Hoek.applyToDefaults(internals.defaults, options);
    
    // contentBaseDir not provided, go down two level
    var contentBaseDir = appSettings_.contentBaseDir || path.resolve(__dirname) + '/../cohevium-content/';
    contentBaseDir = path.normalize(contentBaseDir);
    if (!utils.endsWith(contentBaseDir, '/')) {
        contentBaseDir += '/';
    }
    if (!fs.existsSync(contentBaseDir)) {
        logger_.error({"contentBaseDir": contentBaseDir}, "Content base Directory not found.");
    }
    if (!fs.statSync(contentBaseDir).isDirectory()) {
        logger_.error({"contentBaseDir": contentBaseDir}, "contentBaseDir is not a directory.");
    }
    appSettings_.contentBaseDir = contentBaseDir;

    var serverInfo = {
        REPODIUM_VER: REPODIUM_VER,
        hostname: os.hostname(),
        contentBaseDir : contentBaseDir
    };

    logger_.info({"ContentBaseDir": contentBaseDir}, "Registering Cohevium plugin");

    var contentLoader = new ContentLoader(logger_, appSettings_);
    contentLoader.init();

    plugin.views({
        engines: appSettings_.engines || {
            html: {
                module: Handlebars
            }
        },
        isCached: false,
        path: appSettings_.basePath,
        partialsPath: appSettings_.partialsPath,
        helpersPath: appSettings_.helpersPath
    });

    /**
     * Index web page
     */
    plugin.route({
        method: "GET",
        path: appSettings_.urlPathPrefix + '/index.html',
        handler: function(request, reply) {
            
            var viewContext = {
                serverInfo: serverInfo
            };
            return reply.view(appSettings_.indexTemplate, viewContext);
        }
    });

    /**
     * Public web assets
     */
    plugin.route({
        method: 'GET',
        path: appSettings_.urlPathPrefix + '/public/{path*}',
        config: {
            handler: {
                directory: {
                    path: appSettings_.publicPath,
                    index: false,
                    listing: false
                }
            },
            plugins: {
                lout: false
            }
        }
    });

    /**
     * Show content
     */
    plugin.route({
        method: "GET",
        path: appSettings_.urlPathPrefix + appSettings_.contentUrlPath + '/{path*}',
        handler: function(request, reply) {
            var contentPath = request.params.path;
            // @todo - Retrieve template based on the url
            
            var viewContext = {
                contentPath: serverInfo,
            };

            // Load items
            try {
                contentLoader.load(request, function(themeInstance) {
                    viewContext.appInfo = themeInstance.appInfo;
                    viewContext.items = themeInstance.items;
                    return reply.view(themeInstance.template, viewContext);
                });
            } catch (e) {
                viewContext.error = e;
                return reply.view('error', viewContext);
            }

        }
    });

    /**
     * API: Delete content
     */
    plugin.route({
        path: appSettings_.urlPathPrefix + appSettings_.contentUrlPath + '/{repoName}',
        method: "DELETE",
        handler: function(request, reply) {

            response = {error: 'NO IMPLEMENT'};
            reply(response, 400);
        }
    });

    /**
     * API: Server info
     */
    plugin.route({
        path: appSettings_.urlPathPrefix,
        method: "GET",
        handler: function(request, reply) {

            reply(serverInfo, 200);
        }
    });

    next();
};
 
exports.register.attributes = {
    pkg: require("../package.json")
};

/**
 * Returns list of folders
 */
function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isDirectory();
    });
}

