// Load modules
var os = require('os');
var fs = require('fs');
var path = require('path');
var Hoek = require('hoek');
var Handlebars = require('handlebars');

var utils = require('./utils');
var FileUtil = require('./fileutil').FileUtil;
var ItemsFactory = require('./defaultitemsfactory').DefaultItemsFactory;

var REPODIUM_VER = "0.0.1+20141001";

var CONTENT_PATH = '/content';


// Declare internals
var internals = {
    defaults: {
        pathPrefix: "/cohevium",
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

	settings = Hoek.applyToDefaults(internals.defaults, options);
    
    // contentBaseDir not provided, go down two level
    var contentBaseDir = settings.contentBaseDir || path.resolve(__dirname) + '/../cohevium-content/';
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
    settings.contentBaseDir = contentBaseDir;

    var serverInfo = {
        REPODIUM_VER: REPODIUM_VER,
        hostname: os.hostname(),
        contentBaseDir : contentBaseDir
    };

    logger_.info({"ContentBaseDir": contentBaseDir}, "Registering Cohevium plugin");

    var itemsFactory = new ItemsFactory(logger_, settings);
    itemsFactory.init();

    plugin.views({
        engines: settings.engines || {
            html: {
                module: Handlebars
            }
        },
        isCached: false,
        path: settings.basePath,
        partialsPath: settings.partialsPath,
        helpersPath: settings.helpersPath
    });

    /**
     * Index web page
     */
    plugin.route({
        method: "GET",
        path: settings.pathPrefix + '/index.html',
        handler: function(request, reply) {
            
            var viewContext = {
                serverInfo: serverInfo
            };
            return reply.view(settings.indexTemplate, viewContext);
        }
    });

    /**
     * Public web assets
     */
    plugin.route({
        method: 'GET',
        path: settings.pathPrefix + '/public/{path*}',
        config: {
            handler: {
                directory: {
                    path: settings.publicPath,
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
        path: settings.pathPrefix + CONTENT_PATH + '/{path*}',
        handler: function(request, reply) {
            var contentPath = request.params.path;
            // @todo - Retrieve template based on the url
            
            var viewContext = {
                contentPath: serverInfo,
            };

            // Create items
            try {
                itemsFactory.items(request, function(items){
                    viewContext.items = items;
                    return reply.view('default', viewContext);
                });
            } catch (e) {
                viewContext.error = e;
                return reply.view('error', viewContext);
            }

        }
    });

    /**
     * API: Server info
     */
    plugin.route({
        path: settings.pathPrefix,
        method: "GET",
        handler: function(request, reply) {

            reply(serverInfo, 200);
        }
    });


    /**
     * API: Delete content
     */
    plugin.route({
        path: settings.pathPrefix + CONTENT_PATH + '/{repoName}',
        method: "DELETE",
        handler: function(request, reply) {

            response = {error: 'NO IMPLEMENT'};
            reply(response, 400);
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

