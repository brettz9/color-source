***This project is not complete and probably abandoned (see below)***

JavaScript library to color source code using [SHJS](http://shjs.sourceforge.net).

The core code was available in an older Thunderbird add-on,
[Color Source](https://addons.mozilla.org/en-US/thunderbird/addon/color-source/),
but I have not kept the add-on up to date when Thunderbird made
some breaking changes.

Given my interest in long-term stability, I'm favoring the concept of
full-blown web-based email clients (if necessary using
[AsYouWish](https://github.com/brettz9/asyouwish/) if websockets
[won't work](http://stackoverflow.com/questions/5467395/can-i-use-html5-to-send-a-client-side-email)),
and for a WYSIWYG editor into
which syntax highligthing might be added as a plug-in, I'm partial to
[CKEditor](http://ckeditor.com/). I considered adapting CodeMirror,
but it appears CKEditor itself now
[supports](http://ckeditor.com/demo#widgets)
[syntax](http://docs.ckeditor.com/#!/guide/dev_codesnippet)
[highlighting](http://ckeditor.com/addon/codesnippet)
so I think I may abandon this project now that solutions
are available (though I think that plugin could be improved by
allowing in-place editing, or at least syntax-highlighting within
the dialog where edits are made).
