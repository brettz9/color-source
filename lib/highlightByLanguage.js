/*globals exports, require */
/*
SHJS - Syntax Highlighting in JavaScript
Copyright (C) 2007, 2008 gnombat@users.sourceforge.net
License: http://shjs.sourceforge.net/doc/gplv3.html
*/
'use strict';

function isEmailAddress(url) {
    if (/^mailto:/.test(url)) {
        return false;
    }
    return url.indexOf('@') !== -1;
}

function setHref(tags, numTags, inputString) {
    var url = inputString.substring(tags[numTags - 2].pos, tags[numTags - 1].pos);
    if (url.length >= 2 && url.charAt(0) === '<' && url.charAt(url.length - 1) === '>') {
        url = url.substr(1, url.length - 2);
    }
    if (isEmailAddress(url)) {
        url = 'mailto:' + url;
    }
    tags[numTags - 2].node.href = url;
}

/**
Highlights all elements containing source code in a text string.  The return
value is an array of objects, each representing an HTML start or end tag.  Each
object has a property named pos, which is an integer representing the text
offset of the tag. Every start tag also has a property named node, which is the
DOM element started by the tag. End tags do not have this property.
* @param {String} inputString  a text string
* @param {Object} langObj  a language definition object
* @param {String} classPrefix A "namespacing" prefix to add to all tokens
* @return {Array} An array of tag objects
*/
function highlightString(inputString, langObj, classPrefix) {
    var a, span, ns_html,
        start,
        end,
        startOfNextLine,
        endOfLineMatch,
        line, matchCache, posWithinLine, stateIndex, stackLength, state, numPatterns, mc,
        i, match, bestMatch, bestPatternIndex,
        regex,
        pattern, newStyle, matchedString,
        subexpression,
        // the result
        tags = [],
        numTags = 0,
        // each element is a pattern object from language
        patternStack = [],    
        // the current position within inputString
        pos = 0,
        // the name of the current style, or null if there is no current style
        currentStyle = null,
        endOfLinePattern = /\r\n|\r|\n/g,
        inputStringLength = inputString.length,
        output = function(s, style) {
            var clone, stackLength, pattern, length = s.length;
            // this is more than just an optimization - we don't want to output empty <span></span> elements
            if (length === 0) {
                return;
            }
            if (!style) {
                stackLength = patternStack.length;
                if (stackLength !== 0) {
                    pattern = patternStack[stackLength - 1];
                    // check whether this is a state or an environment
                    if (!pattern[3]) {
                        // it's not a state - it's an environment; use the style for this environment
                        style = pattern[1];
                    }
                }
            }
            if (currentStyle !== style) {
                if (currentStyle) {
                    tags[numTags++] = {pos: pos};
                    if (currentStyle === 'sh_url') {
                        setHref(tags, numTags, inputString);
                    }
                }
                if (style) {
                    if (style === 'sh_url') {
                        clone = a.cloneNode(false);
                    }
                    else {
                        clone = span.cloneNode(false);
                    }
                    clone.className = classPrefix ? classPrefix + style : style;
                    tags[numTags++] = {node: clone, pos: pos};
                }
            }
            pos += length;
            currentStyle = style;
        };
  
    endOfLinePattern.lastIndex = 0;
    if (document.createElementNS) {
        ns_html = 'http://www.w3.org/1999/xhtml';
        a = document.createElementNS(ns_html, 'a');
        span = document.createElementNS(ns_html, 'span');
    }
    else {
        a = document.createElement('a');
        span = document.createElement('span');
    }
    
    
    while (pos < inputStringLength) {
        start = pos;
        endOfLineMatch = endOfLinePattern.exec(inputString);
        
        if (endOfLineMatch === null) {
            end = inputStringLength;
            startOfNextLine = inputStringLength;
        }
        else {
            end = endOfLineMatch.index;
            startOfNextLine = endOfLinePattern.lastIndex;
        }

        line = inputString.substring(start, end);
        matchCache = [];
        
        for (;;) {
            posWithinLine = pos - start;
            stackLength = patternStack.length;
            stateIndex = (stackLength === 0) ? 0 : 
                                                // get the next state
                                                patternStack[stackLength - 1][2];
            state = langObj[stateIndex];
            numPatterns = state.length;
            mc = matchCache[stateIndex];
            if (!mc) {
                mc = matchCache[stateIndex] = [];
            }
            
            bestMatch = null;
            bestPatternIndex = -1;
            for (i = 0; i < numPatterns; i++) {
                if (i < mc.length && (mc[i] === null || posWithinLine <= mc[i].index)) {
                    match = mc[i];
                }
                else {
                    regex = state[i][0];
                    regex.lastIndex = posWithinLine;
                    match = regex.exec(line);
                    mc[i] = match;
                }
                if (match !== null && (bestMatch === null || match.index < bestMatch.index)) {
                    bestMatch = match;
                    bestPatternIndex = i;
                    if (match.index === posWithinLine) {
                        break;
                    }
                }
            }

            if (bestMatch === null) {
                output(line.substring(posWithinLine), null);
                break;
            }
            else {
                // got a match
                if (bestMatch.index > posWithinLine) {
                    output(line.substring(posWithinLine, bestMatch.index), null);
                }

                pattern = state[bestPatternIndex];
                newStyle = pattern[1];
                if (newStyle instanceof Array) {
                    for (subexpression = 0; subexpression < newStyle.length; subexpression++) {
                        matchedString = bestMatch[subexpression + 1];
                        output(matchedString, newStyle[subexpression]);
                    }
                }
                else {
                    matchedString = bestMatch[0];
                    output(matchedString, newStyle);
                }

                switch (pattern[2]) {
                    case -1:
                        // do nothing
                        break;
                    case -2:
                        // exit
                        patternStack.pop();
                        break;
                    case -3:
                        // exitall
                        patternStack.length = 0;
                        break;
                    default:
                        // this was the start of a delimited pattern or a state/environment
                        patternStack.push(pattern);
                        break;
                }
            }
        }

        // end of the line
        if (currentStyle) {
            tags[numTags++] = {pos: pos};
            if (currentStyle === 'sh_url') {
                setHref(tags, numTags, inputString);
            }
            currentStyle = null;
        }
        pos = startOfNextLine;
    }

    return tags;
}

////////////////////////////////////////////////////////////////////////////////
// DOM-dependent functions

function getClasses(element) {
    var result = [],
        i, htmlClasses,
        htmlClass = element.className;
    if (htmlClass && htmlClass.length > 0) {
        htmlClasses = htmlClass.split(' ');
        for (i = 0; i < htmlClasses.length; i++) {
            if (htmlClasses[i].length > 0) {
                result.push(htmlClasses[i]);
            }
        }
    }
    return result;
}

function addClass(element, name) {
    var i, htmlClasses = getClasses(element);
    for (i = 0; i < htmlClasses.length; i++) {
        if (name.toLowerCase() === htmlClasses[i].toLowerCase()) {
            return;
        }
    }
    htmlClasses.push(name);
    element.className = htmlClasses.join(' ');
}

/**
Extracts the tags from an HTML DOM NodeList.
@param  nodeList  a DOM NodeList
@param  result  an object with text, tags and pos properties
*/
function extractTagsFromNodeList(nodeList, result) {
    var i, node, terminator, length = nodeList.length;
    for (i = 0; i < length; i++) {
        node = nodeList.item(i);
        switch (node.nodeType) {
            case 1:
                if (node.nodeName.toLowerCase() === 'br') {
                    terminator = (/MSIE/.test(navigator.userAgent)) ? '\r' : '\n';
                    result.text.push(terminator);
                    result.pos++;
                }
                else {
                    result.tags.push({node: node.cloneNode(false), pos: result.pos});
                    extractTagsFromNodeList(node.childNodes, result);
                    result.tags.push({pos: result.pos});
                }
                break;
            case 3: case 4:
                result.text.push(node.data);
                result.pos += node.length;
                break;
        }
    }
}

/**
Extracts the tags from the text of an HTML element. The extracted tags will be
returned as an array of tag objects. See highlightString for the format of
the tag objects.
@param  element  a DOM element
@param  tags  an empty array; the extracted tag objects will be returned in it
@return  the text of the element
@see  highlightString
*/
function extractTags(element, tags) {
    var result = {};
    result.text = [];
    result.tags = tags;
    result.pos = 0;
    extractTagsFromNodeList(element.childNodes, result);
    return result.text.join('');
}

/**
Merges the original tags from an element with the tags produced by highlighting.
@param  originalTags  an array containing the original tags
@param  highlightTags  an array containing the highlighting tags - these must not overlap
@result  an array containing the merged tags
*/
function mergeTags(originalTags, highlightTags) {
    var numOriginalTags = originalTags.length, 
        numHighlightTags = highlightTags.length,
        result = [],
        originalIndex = 0,
        highlightIndex = 0,
        originalTag, highlightTag;
    
    if (numOriginalTags === 0) {
        return highlightTags;
    }
    if (numHighlightTags === 0) {
        return originalTags;
    }

    while (originalIndex < numOriginalTags && highlightIndex < numHighlightTags) {
        originalTag = originalTags[originalIndex];
        highlightTag = highlightTags[highlightIndex];

        if (originalTag.pos <= highlightTag.pos) {
            result.push(originalTag);
            originalIndex++;
        }
        else {
            result.push(highlightTag);
            if (highlightTags[highlightIndex + 1].pos <= originalTag.pos) {
                highlightIndex++;
                result.push(highlightTags[highlightIndex]);
                highlightIndex++;
            }
            else {
                // new end tag
                result.push({pos: originalTag.pos});

                // new start tag
                highlightTags[highlightIndex] = {node: highlightTag.node.cloneNode(false), pos: originalTag.pos};
            }
        }
    }

    while (originalIndex < numOriginalTags) {
        result.push(originalTags[originalIndex]);
        originalIndex++;
    }

    while (highlightIndex < numHighlightTags) {
        result.push(highlightTags[highlightIndex]);
        highlightIndex++;
    }

    return result;
}

/**
Inserts tags into text.
@param  tags  an array of tag objects
@param  text  a string representing the text
@return  a DOM DocumentFragment representing the resulting HTML
*/
function insertTags(tags, text) {
    var doc = document,
        result = document.createDocumentFragment(),
        tagIndex = 0,
        numTags = tags.length,
        textPos = 0,
        textLength = text.length,
        currentNode = result,
        tag, tagPos, newNode;

    // output one tag or text node every iteration
    while (textPos < textLength || tagIndex < numTags) {
        if (tagIndex < numTags) {
            tag = tags[tagIndex];
            tagPos = tag.pos;
        }
        else {
            tagPos = textLength;
        }

        if (tagPos <= textPos) {
            // output the tag
            if (tag.node) {
                // start tag
                newNode = tag.node;
                currentNode.appendChild(newNode);
                currentNode = newNode;
            }
            else {
                // end tag
                currentNode = currentNode.parentNode;
            }
            tagIndex++;
        }
        else {
            // output text
            currentNode.appendChild(doc.createTextNode(text.substring(textPos, tagPos)));
            textPos = tagPos;
        }
    }

    return result;
}

/**
* Highlights an element containing source code.  Upon completion of this function,
* the element will have been placed in the "sh_sourceCode" class.
* @param {Element} element  A DOM <pre> element containing the source code to be highlighted
* @param {Object} language  A language definition object
* @param {String} classPrefix Allows for "namespacing" of CSS classes
*/
function highlightElement(element, languageObj, classPrefix, cloneNode) {
    var inputString, highlightTags, tags, documentFragment,
        originalTags = [], 
        elem = cloneNode ? 
                element.cloneNode(true) : 
                typeof element === 'string' ?  
                    new DOMParser().parseFromString(element, 'text/html') : 
                    element;
    
    addClass(elem, (classPrefix || '') + 'sh_sourceCode');
    inputString = extractTags(elem, originalTags);
    highlightTags = highlightString(inputString, languageObj, classPrefix);
    tags = mergeTags(originalTags, highlightTags);
    documentFragment = insertTags(tags, inputString);
    
    while (elem.hasChildNodes()) {
        elem.removeChild(elem.firstChild);
    }
    elem.appendChild(documentFragment);
    return elem;
}


/**
* Obtain language-specific object
* @param {String} language Language to include
* @param {Function} callback Callback function to be invoked with SH language object
*/
function loadLanguageObject (language, callback) {
    var langObj;
    switch (language) { // Apparently can't do a require dynamically for sake of add-on review
        case 'bison':
            require('./bison', callback);
            break;
        case 'c':
            require('./c', callback);
            break;
        case 'caml':
            require('./caml', callback);
            break;
        case 'changelog':
            require('./changelog', callback);
            break;
        case 'cpp':
            require('./cpp', callback);
            break;
        case 'csharp':
            require('./csharp', callback);
            break;
        case 'css':
            require('./css', callback);
            break;
        case 'desktop':
            require('./desktop', callback);
            break;
        case 'diff':
            require('./diff', callback);
            break;
        case 'flex':
            require('./flex', callback);
            break;
        case 'glsl':
            require('./glsl', callback);
            break;
        case 'haxe':
            require('./haxe', callback);
            break;
        case 'html':
            require('./html', callback);
            break;
        case 'java':
            require('./java', callback);
            break;
        case 'javascript':
            require('./javascript', callback);
            break;
        case 'javascript_dom':
            require('./javascript_dom', callback);
            break;
        case 'latex':
            require('./latex', callback);
            break;
        case 'ldap':
            require('./ldap', callback);
            break;
        case 'log':
            require('./log', callback);
            break;
        case 'lsm':
            require('./lsm', callback);
            break;
        case 'm4':
            require('./m4', callback);
            break;
        case 'makefile':
            require('./makefile', callback);
            break;
        case 'oracle':
            require('./oracle', callback);
            break;
        case 'perl':
            require('./perl', callback);
            break;
        case 'php':
            require('./php', callback);
            break;
        case 'prolog':
            require('./prolog', callback);
            break;
        case 'properties':
            require('./properties', callback);
            break;
        case 'python':
            require('./python', callback);
            break;
        case 'ruby':
            require('./ruby', callback);
            break;
        case 'scala':
            require('./scala', callback);
            break;
        case 'sh':
            require('./sh', callback);
            break;
        case 'slang':
            require('./slang', callback);
            break;
        case 'sml':
            require('./sml', callback);
            break;
        case 'spec':
            require('./spec', callback);
            break;
        case 'sql':
            require('./sql', callback);
            break;
        case 'tcl':
            require('./tcl', callback);
            break;
        case 'url':
            require('./url', callback);
            break;
        case 'xml':
            require('./xml', callback);
            break;
        case 'xorg':
            require('./xorg', callback);
            break;
        default:
            throw 'Unrecognized language attempted with require';
    }
}

/**
 * Obtain an HTML string representing the syntax highlighted elements of a 
 *   given element for the desired language.
 */
function highlightByLanguage (config) {
    loadLanguageObject(config.language, function (langObj) {
        config.callback(
            highlightElement(config.element, langObj, config.classPrefix, config.cloneNode)
        );
    });
}

// EXPORTS (currently only using one externally)
module.exports = highlightByLanguage;

