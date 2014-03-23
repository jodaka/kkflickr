/*global chrome */

( function() {

    'use strict';

    var cfg = {};

    chrome.storage.sync.get( {

        tags: {},
        pictureSize: '640',
        allowFullSize: false,
        isPrivate: '1'

    }, function( newConfig ) {

        console.log( 222, newConfig );

        cfg = newConfig;
        applySettings( cfg );
        setupHandlers();
    });


    var setupHandlers = function() {

        var i;

        var radioButtons = document.querySelectorAll( 'input[type=radio]' );
        var checkboxButtons = document.querySelectorAll( 'input[type=checkbox]' );

        var radioChange = function() {
            cfg[ this.name ] = this.value;
            saveSettings();
        };
        for ( i = 0; i < radioButtons.length; i++ ) {
            radioButtons[ i ].addEventListener( 'change', radioChange );
        }

        var checkboxChange = function () {
            cfg[ this.name ] = this.checked;
            saveSettings();
        };
        for ( i = 0; i < checkboxButtons.length; i++ ) {
            checkboxButtons[ i ].addEventListener( 'change', checkboxChange );
        }

        var addBtn = document.getElementById( 'addTagButton' );
        var addInput = document.getElementById( 'addTagInput' );
        addBtn.addEventListener( 'click', function ( ) {

            var val = addInput.value
                .trim()
                .replace(/ /g, '_')
                .replace(/'/g, '&#39;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            if ( ! cfg.tags[val] && val !== '' ) {
                cfg.tags[val] = 1;
                addTagNode(val);
                saveSettings();
                addInput.value = '';
            }

        } );


        var tagsList = document.getElementById('tags_list');
        tagsList.addEventListener('click', function(evt){

            if ( evt.target && evt.target.className === 'delete' ) {
                var tag = decodeURIComponent(evt.target.parentNode.getAttribute('data-tag'));
                if (cfg.tags[tag]) {
                    delete cfg.tags[tag];
                    saveSettings();
                    tagsList.removeChild(evt.target.parentNode);
                }
            }

        });

    };

    var removeChildNodes = function ( node ) {
        var last = node.lastChild;
        while ( last ) {
            node.removeChild( last );
            last = node.lastChild;
        }
        return node;
    };

    var saveSettings = function() {

        chrome.storage.sync.set( cfg, function() {
            console.log( 'settings saved', cfg );
        } );
    };

    var addTagNode = function(tag) {
        document.getElementById( 'tags_list' ).innerHTML += '<li data-tag="' + encodeURIComponent(tag) + '"> ' + tag + ' <a href="#" class="delete"></a></li>';
    };

    var applySettings = function( cfg ) {

        var tagsNode = document.getElementById( 'tags_list' );
        removeChildNodes( tagsNode );

        for ( var tag in cfg.tags ) {
            if ( cfg.tags.hasOwnProperty( tag ) ) {
                addTagNode(tag);
            }
        }

        document.querySelector( "input[type=radio][value='" + cfg.pictureSize + "']" ).checked = 'checked';
        console.log( 555, "input[type=radio][value='" + cfg.pictureSize + "']" );

        if ( cfg.allowFullSize ) {
            document.getElementById( 'allowFullSize' ).checked = 'checked';
        }

        document.querySelector( "input[type=radio][value='" + cfg.isPrivate + "']" ).checked = 'checked';

        if ( cfg.allowFullSize ) {
            document.getElementById( 'allowFullSize' ).checked = 'checked';
        }


    };


}() );