// This is an active module of the Color Source Add-on

/* 
Todos: 
1) incorporate add-on, but make available in Firefox for insertion as formatted HTML in contenteditable areas 
    or as text in other textareas; also try to get working again in Thunderbird
*/

/* Imports a commonjs style javascript file with loadSubScrpt
* By Erik Vold <erikvvold@gmail.com> http:/erikvold.com/
*
* @param src (String)
* The url of a javascript file.
*/

const { Cc, Ci, Cu } = require('chrome'); // Comment out for JSLint

// Based on http://erikvold.com/blog/index.cfm/2011/6/19/restartless-firefox-addons-part-8-require-commonjs-and-jetpack
(function(global) {
  var modules = {};
  global.require = function require(src) {
    if (modules[src]) {
        return modules[src];
    }
    var tools = {}, 
        scope = {require: global.require, exports: {}};
    Cu['import']("resource://gre/modules/Services.jsm", tools);
    var baseURI = tools.Services.io.newURI(__SCRIPT_URI_SPEC__, null, null);
    try {
      var uri = tools.Services.io.newURI(
          "packages/" + src + ".js", null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    } catch (e) {
      var uri = tools.Services.io.newURI(src, null, baseURI);
      tools.Services.scriptloader.loadSubScript(uri.spec, scope);
    }
    return modules[src] = scope.exports || scope.module.exports; // Brett added last portion to allow functions
  }
})(this);


exports.main = function() {

    var highlightByLanguage = require('./sh_main').highlightByLanguage;
    
    // Todos: allow custom language and styles stored in prefs

    
    
    if (require('sh_styles').indexOf(style) > -1) { // We could check file system, but this is easier, though a little redundant
        // 'sh_' + style + '.css';
    }

};

/*

todo: update https://addons.mozilla.org/en-US/thunderbird/addon/color-source/ to refer users to new addon

todo: incorporate summary and details as from Thunderbird:


summary:
Add syntax highlighting of code in various languages to email messages via context menu.

details:

Steps to use:
1. While in a Thunderbird message, right click to choose a default coloring style for syntax highlighting
2. Highlight the text of the code you wish to have highlighted. (You may wish to put text above and below your code so that you can add text around it which is not highlighted.)
3. Select via right-click the computer language by which you wish the current selection to be interpreted.

Works well with Stationery, if you want to tweak the source code that is generated: https://addons.mozilla.org/en-US/thunderbird/addon/4394

Uses SHJS (at http://shjs.sourceforge.net/ ) for the coloring algorithm and default styles.

Until the extension supports the ability to define your own styles (it is planned!!), you may use Stationery to tweak your own styles manually for each message (or if you know what you're doing (and make a back-up elsewhere since the extension folder will be overwritten upon each update!), add a CSS file in the same format as the other files in the extension's skin directory, i.e., name the file "sh_"+NAME+".css" and add appropriate styles as used in the other files).
*/


/*
Todo: incorporate code below! Also change Ajax in sh_main.js to use require()

Was:

if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['bison'] = [


*/

(function () {

// Private variables
var NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';


// Private methods
function _removeAllChildren (elem) {
    var popupChild = elem.firstChild;
    while (popupChild) {
        elem.removeChild(popupChild);
        popupChild = elem.firstChild;
    }
}

function ser (dom) {
    return new XMLSerializer().serializeToString(dom);
}

function _makeFileURL (path) {
    return 'file://'+path.replace(/\\/g, '/')+'/';
}

/**
 * Get a directory within an extension
 * @param {String} ext_id The extension's unique ID from install.rdf
 * @param {String} dir The directory
 * @returns {Components.interfaces.nsIFile} The (directory) file object
 */
function _getExtensionDirectory (ext_id, dir) {
    var em = Cc["@mozilla.org/extensions/manager;1"].
             getService(Ci.nsIExtensionManager);
    // the path may use forward slash ("/") as the delimiter
    // returns nsIFile for the extension's install.rdf
    return em.getInstallLocation(ext_id).getItemFile(ext_id, dir);
}

function _file_get_contents (url, callback, errCb, currentStyle) {
    var request = new XMLHttpRequest();
    request.open('GET', url+'?date'+(new Date()), true); // avoid caching
    request.overrideMimeType('text/plain');
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            try {
                if (! request.status || request.status === 200) {
                    callback(request.responseText, currentStyle);
                }
                else {
                    errCb(request.status);
                }
            }
            finally {
                request = null;
            }
        }
    };
    request.send(null);
}


/**
 * @param {String} id ID of the menupopup
 * @param {Components.interfaces.nsIFile} dir Directory to iterate for content
 * @param {String} prefix The prefix to use for localization (e.g., 'lang_' or 'skin_')
 * @param {RegExp} regex Regular expression to isolate (localizable) string out of file name
 * @param {Boolean} checkbox Whether the menu items should be checkboxes or not
 */
function _populateMenu (id, dir, prefix, regex, checkbox) {
    var popup = document.getElementById(id);
    var entries = dir.directoryEntries;
    while (entries.hasMoreElements()) {
        var entry = entries.getNext();
        entry.QueryInterface(Components.interfaces.nsIFile);
        var value = entry.path.match(regex)[1];

        var menuitem = document.createElementNS(NS_XUL, 'menuitem');
        if (checkbox) {
            menuitem.setAttribute('type', 'checkbox');
        }

        var localeValue, localeAccessKey;
        try {
            localeValue = this.STRS.GetStringFromName(prefix+value);
        }
        catch(e) {}
        try {
            localeAccessKey = this.STRS.GetStringFromName(prefix+'_accesskey_'+value);
        }
        catch(e) {}

        menuitem.setAttribute('value', value);
        menuitem.setAttribute('id', value);
        menuitem.setAttribute('label', localeValue || value); // Allow translation (or at least better naming) of languages
        menuitem.setAttribute('accesskey', localeAccessKey || value.substr(0, 1));
        popup.appendChild(menuitem);
    }
    return popup;
}

/**
 * Find the current stylehseet
 * @param {String} path The path to the root of the file to obtain
 * @param {Function} cb The callback function for use when a file is found
 * @param {Function} errCb An error callback
 */
function _getCurrentStylesheet (path, cb, errCb) {
    var currentStyle = this.prefs.getCharPref('extensions.color_source.lastStyle');
    
    _file_get_contents(_makeFileURL(path)+'sh_'+currentStyle+'.css', cb, errCb, currentStyle);
}

var color_source = {
    onLoad : function () {
        var that = this;
        this.appliedStyles = {};
        var STR_PROPERTIES = 'chrome://color_source/locale/color_source.properties';
        this.STRS = Cc['@mozilla.org/intl/stringbundle;1'].getService(Ci.nsIStringBundleService).
                                                createBundle(STR_PROPERTIES);

        var langDir = _getExtensionDirectory("color_source@brett.zamir", "content/langs");
        this.langDirPath = langDir.path;
        var skinDir = _getExtensionDirectory("color_source@brett.zamir", "skin");
        this.skinDirPath = skinDir.path;

        var langMenupopup = _populateMenu.call(this, 'color_source-langs', langDir, 'lang_', /[\/\\]sh_([^\/\\]*?)\.js$/);
        var skinMenupopup = _populateMenu.call(this, 'color_source-skins', skinDir, 'skin_', /[\/\\]sh_([^\/\\]*?)\.css$/, true);

/**
// Works but need to implement CSS editor
        var menuitem = document.createElementNS(NS_XUL, 'menuitem');
        menuitem.setAttribute('value', 'createNewStyles');
        menuitem.setAttribute('label', this.STRS.GetStringFromName('createNewStyles')); // Allow translation (or at least better naming) of languages
        menuitem.setAttribute('accesskey', this.STRS.GetStringFromName('access_createNewStyles'));
        skinMenupopup.appendChild(menuitem);
//*/

        this.prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService);
        var lastStyle = this.prefs.getCharPref('extensions.color_source.lastStyle');
        if (lastStyle) {
            document.getElementById(lastStyle).setAttribute('checked', 'true');
            this.currElement = document.getElementById(lastStyle);
        }

        langMenupopup.addEventListener('command',
            function (e) {
                that.colorCode(e.target.value);
            },
            true
        );
        skinMenupopup.addEventListener('command',
            function (e) {
                if (e.target.value === 'createNewStyles') {
                    // Fix: implement call to CSS editor
                    
                    return;
                }
                if (that.currElement) {
                    that.currElement.setAttribute('checked', 'false');
                }
                that.currElement = e.target;
                that.currElement.setAttribute('checked', 'true');
                that.prefs.setCharPref('extensions.color_source.lastStyle', e.target.id);
            },
            true
        );
    },
    colorCode : function (language) {
        var ed = GetCurrentEditor();
        var code = ed.selection.toString();
        var that = this;

        function _insertHTML (styles, currentStyle) {
            styles =  styles ? // (styles && !that.appliedStyles[currentStyle]) ?  // Test usually works, but sometimes a stale copy is used (onLoad not called anew), thinking we have already used this before
                                '<style type="text/css">'+styles.replace(/\.sh_/g, '.'+currentStyle+'_'+'sh_')+'</style>' : '';

            var element = document.createElementNS('http://www.w3.org/1999/xhtml', 'pre');
            var text = document.createTextNode(code);
            element.appendChild(text);

            highlightByLanguage({
                language: language,
                element: element,
                callback: function (elements) {
/*                    if (elements[0].innerHTML !== '') {
                        ed.insertHTML(ser(elements[0]));
                        if (styles) {
                            ed.insertHTMLWithContext (styles, '', '', '', null, ed.rootElement, 0, false); // Insert styles at head
                            that.appliedStyles[currentStyle] = true;
                        }
                    }*/
                    if (elements[0].innerHTML !== '') {
                        ed.insertHTML('<div>'+(styles+ser(elements[0]).replace(/\r\n/g, '\n'))+'</div>');
                    }
                },
                classPrefix: currentStyle + '_' // Use as prefix to ensure each style type's tokens has a unique class
            });
        }
        function _errCb (err) {
            alert('HTTP error: status '+err);
        }
        _getCurrentStylesheet.call(this, this.skinDirPath, _insertHTML, _errCb);
    }
};

this.color_source = color_source;

}());

window.addEventListener('load', function () {color_source.onLoad();}, false);

