/*global CryptoJS:true, chrome:true */
/*eslint-env browser*/

console.log( '------------- flickr api loaded --------------' );

( function () {

    'use strict';

    var cfg = {
        key: 'fe3a846ec5c392c937cf4c773417759f',
        secret: '6c3041e58e91cf6f',
        baseURL: 'https://flickr.com/services/',
        textareaSelector: '.bbCodeEditorContainer textarea'
    };

    var settings = {};

    /**
     * [ description]
     * @param  {[type]} attempts [description]
     * @return {[type]}          [description]
     */
    var injectKKFcode = function ( attempts ) {

        var e = document.getElementsByClassName( 'redactor_box' )[ 0 ];
        var holder = document.querySelector( '.redactor_box .redactor_toolbar' );

        if ( typeof e === 'undefined' || holder === null ) {

            if ( typeof attempts === 'undefined' ) {
                attempts = 25;
            } else {
                attempts -= 1;
            }

            if ( attempts === 0 ) {
                console.warn( 'Can\'t inject KKF code. Timeout reached' );
                return;
            }

            // console.log( ' CANT FIND cke_vB_Editor_QR_editor ', e );
            setTimeout( function () {
                injectKKFcode( attempts );
            }, 300 );

            return;
        }

        // progress holder
        var progressHolder = document.createElement( 'div' );
        progressHolder.setAttribute( 'id', 'kkflickr_progress' );
        progressHolder.innerHTML = '<div id="kkflickr_loading_holder" style="display: none">&nbsp;<div id="kkflickr_loading"><span id="kkflickr_loading1"></span><span id="kkflickr_loading2"></span></div></div>';
        e.parentNode.insertBefore( progressHolder, e );

        // toolbar button

        var toolbar = document.createElement( 'li' );
        toolbar.setAttribute( 'class', 'redactor_btn_group' );
        toolbar.innerHTML = '\
                <ul>\
                    <li style="display: none" id="kkflickr_auth_btn">\
                        <a href="javascript:void(null);" unselectable="on" tabindex="-1"></a>\
                    </li>\
                    <li style="display: none" id="kkflickr_upload_btn">\
                        <input type="file" id="kkflickrUploadInput" multiple="multiple" accept="image/*" />\
                        <a href="javascript:void(null);" unselectable="on" tabindex="-1"></a>\
                    </li>\
                </ul>';

        holder.appendChild( toolbar );

        setTimeout(function(){
            document.getElementById( 'kkflickr_auth_btn' ).addEventListener( 'click', requestFrob, true );

            var uploadBtn = document.getElementById( 'kkflickr_upload_btn' );
            // uploadBtn.addEventListener('click', uploadDialog, true);
            uploadBtn.addEventListener( 'change', uploadDialog );

        }, 4);


    };

    /**
     * [ description]
     * @param  {[type]} request [description]
     * @return {[type]}         [description]
     */
    var signRequest = function ( request ) {

        var pairs = request.split( '&' );
        var params = [];
        var i;

        for ( i = 0; i < pairs.length; i++ ) {
            params.push( pairs[ i ].split( '=' ) );
        }
        params.push( [ 'api_key', cfg.key ] );

        var sorted = params.sort( function ( a, b ) {
            if ( a[ 0 ] > b[ 0 ] ) {
                return 1;
            }
            if ( a[ 0 ] < b[ 0 ] ) {
                return -1;
            }
            return 0;
        } );

        var paramsString = cfg.secret;
        for ( i = 0; i < sorted.length; i++ ) {
            paramsString += String( sorted[ i ][ 0 ] ) + sorted[ i ][ 1 ];
        }

        return '?api_key=' + cfg.key + '&' + request + '&api_sig=' + CryptoJS.MD5( paramsString );
    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var requestFrob = function () {
        window.localStorage.setItem( 'kkflickr_frobRequestURL', window.location.href );

        var textarea = document.querySelector( cfg.textareaSelector );
        if ( textarea ) {
            window.localStorage.setItem( 'kkflickr_savedText', textarea.value );
        }

        window.location.href = cfg.baseURL + 'auth/' + signRequest( 'perms=write' );
    };

    /**
     * [ description]
     * @param  {[type]} id       [description]
     * @param  {[type]} text     [description]
     * @param  {[type]} progress [description]
     * @return {[type]}          [description]
     */
    var updateProgress = function ( id, status, progress, text ) {

        if ( typeof id === 'undefined' ) {
            console.warn( 'ERROR no ID in updateProgress' );
            return;
        }

        var holder = document.getElementById( 'kkflickr_' + id );
        if ( holder === null ) {

            holder = document.createElement( 'div' );
            holder.setAttribute( 'id', 'kkflickr_' + id );
            holder.setAttribute( 'class', '_kkf' );

            var elName = document.createElement( 'span' );
            elName.setAttribute( 'class', 'title' );
            elName.appendChild( document.createTextNode( text ) );

            var elStatus = document.createElement( 'span' );
            elStatus.setAttribute( 'class', 'status' );
            elStatus.textContent = status;

            var elProgress = document.createElement( 'progress' );
            elProgress.setAttribute( 'class', 'progress' );
            elProgress.setAttribute( 'max', 100 );
            elProgress.setAttribute( 'value', progress );

            holder.appendChild( elName );
            holder.appendChild( elStatus );
            holder.appendChild( elProgress );

            var parent = document.getElementById( 'kkflickr_progress' );
            parent.appendChild( holder );
            document.getElementById( 'kkflickr_loading_holder' ).style.display = 'block';

        } else {

            if ( typeof progress !== 'undefined' ) {
                holder.getElementsByClassName( 'progress' )[ 0 ].setAttribute( 'value', progress );
            }

            holder.getElementsByClassName( 'status' )[ 0 ].textContent = status;
        }


    };

    /**
     * [ description]
     * @param  {[type]} id    [description]
     * @param  {[type]} photo [description]
     * @return {[type]}       [description]
     */
    var uploadPhoto = function ( id, photo ) {

        var resultFired = false;

        var formData = new FormData();
        formData.append( 'photo', photo );

        var tags = '';
        if ( Object.keys( settings.tags ).length > 0 ) {
            tags = '&tags=';
            for ( var tag in settings.tags ) {
                if ( settings.tags.hasOwnProperty( tag ) ) {
                    tags += encodeURIComponent( tag ) + ' ';
                }
            }
            tags = tags.trim();
        }

        // encoding params
        var params = signRequest( 'title=' + photo.name + tags + '&hidden=2&async=1&is_public=' + ( settings.isPrivate === '1' ? 0 : 1 ) + '&auth_token=' + cfg.token ).replace( /^\?/, '' ).split( '&' );

        for ( var i = 0; i < params.length; i++ ) {
            var pair = params[ i ].split( '=' );
            formData.append( pair[ 0 ], pair[ 1 ] );
        }

        var xhr = new XMLHttpRequest();

        // progress indicator
        xhr.upload.addEventListener( 'progress', function ( progress ) {
            var perc = Math.round( progress.loaded * 100 / progress.total );
            updateProgress( id, 'uploading', perc );
        }, false );

        xhr.addEventListener( 'readystatechange', function ( evt ) {

            if ( !evt || !evt.target ) {
                return;
            }

            if ( !resultFired && evt.target.readyState === 4 ) {
                resultFired = true;
                // console.log( evt, evt.target.responseText );

                try {
                    var response = new DOMParser().parseFromString( evt.target.responseText, 'text/xml' );
                    if ( response.documentElement.getAttribute( 'stat' ) === 'ok' ) {
                        var ticket = response.getElementsByTagName( 'ticketid' )[ 0 ].textContent;
                        getPhotoId( id, ticket );
                    }

                } catch ( e ) {
                    console.error( e );
                }


            }
        }, false );

        xhr.open( 'post', cfg.baseURL + 'upload/', true );
        xhr.send( formData );
    };

    var toggleEditorMode = function ( sourceMode ) {

        var editor = document.querySelector( cfg.textareaSelector );

        if ( sourceMode && !editor ) {
            console.log( 'changing editor' );
            cfg.restoreSourceMode = true;
            document.querySelector( '.redactor_btn_switchmode' ).click();
            return;
        }

        if ( !sourceMode && editor ) {
            document.querySelector( '.bbCodeEditorContainer div a' ).click();
            delete cfg.restoreSourceMode;
        }

    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var uploadDialog = function () {

        console.log(11, 'upload dialog');
        toggleEditorMode( true );

        var photos = document.getElementById( 'kkflickrUploadInput' ).files;

        console.log(22, 'upload dialog');
        for ( var i = 0, len = photos.length; i < len; i++ ) {
            var photo = photos[ i ];
            var id = CryptoJS.MD5( photo.name + photo.size + Date.now() ).toString();

            updateProgress( id, 'preparing', 0, photo.name );
            uploadPhoto( id, photo );
        }
    };

    /**
     * [ description]
     * @param  {[type]} photoId [description]
     * @return {[type]}         [description]
     */
    var getPhotoSizes = function ( id, photoId ) {


        fetch( cfg.baseURL + 'rest/' + signRequest( 'method=flickr.photos.getSizes&photo_id=' + photoId + '&nojsoncallback=1&format=json&auth_token=' + cfg.token ) )
            .then( function ( response ) {
                return response.json();
            } )
            .then( function ( json ) {

                var ffoundRightSize = false;

                var source = null;
                for ( var i = json.sizes.size.length - 1; i > -1; i-- ) {

                    if ( json.sizes.size[ i ].label === 'Original' ) {
                        source = json.sizes.size[ i ].source;
                        continue;
                    }

                    if ( json.sizes.size[ i ].width === settings.pictureSize ) {
                        postResult( id, json.sizes.size[ i ].source, source );
                        ffoundRightSize = true;
                        break;
                    } else {
                        console.warn( 'Direct photo url ', json.sizes.size[ i ].source );
                    }
                }

                if ( !ffoundRightSize && json.sizes.size.length > 0 ) {
                    postResult( id, json.sizes.size[ json.sizes.size.length - 1 ].source );
                }
            } )
            .catch( function ( err ) {
                console.error( 'Couldn\'t get photo sizes.', err );
            } );
    };

    /**
     * [ description]
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    var postResult = function ( id, url, source ) {

        updateProgress( id, 'DONE' );
        console.log('must post result ', id, url, source);

        var resultHolder = document.querySelector( cfg.textareaSelector );
        if ( resultHolder === null ) {
            console.error( 'Couldnt find results holder ', cfg.textareaSelector );
        }

        var img = '[IMG]' + url + '[/IMG]';
        if ( settings.allowFullSize && typeof source !== 'undefined' && source !== '' ) {
            resultHolder.value += '\n[URL="' + source + '"]' + img + '[/URL]';
        } else {
            resultHolder.value += '\n' + img;
        }

        // let's remove finished items after timeout
        setTimeout( function () {

            var resultHolder = document.getElementById( 'kkflickr_' + id );

            if ( resultHolder ) {
                var parent = resultHolder.parentNode;
                parent.removeChild( resultHolder );

                if ( parent.childNodes.length === 1 ) {
                    document.getElementById( 'kkflickr_loading_holder' ).style.display = 'none';
                    if ( cfg.restoreSourceMode ) {
                        toggleEditorMode();
                    }
                }

            }

        }, 2000 );

    };

    /**
     * [ description]
     * @param  {[type]} frob [description]
     * @return {[type]}      [description]
     */
    var getAuthToken = function ( frob ) {

        fetch( cfg.baseURL + 'rest/' + signRequest( 'method=flickr.auth.getToken&nojsoncallback=1&format=json&frob=' + frob ) )
            .then( function ( response ) {
                return response.json();
            } )
            .then( function ( data ) {
                if ( data && data.stat === 'ok' && data.auth && data.auth.token && data.auth.token._content ) {

                    var flickrAuth = localStorage.getItem( 'flickrAuth' );

                    try {
                        flickrAuth = ( flickrAuth ) ? JSON.parse( flickrAuth ) : {};
                    } catch ( e ) {
                        flickrAuth = {};
                    }

                    if ( !flickrAuth || !flickrAuth.token ) {
                        flickrAuth = {
                            token: data.auth.token._content
                        };
                    } else {
                        flickrAuth.token = data.auth.token._content;
                    }
                    cfg.token = data.auth.token._content;
                    // console.log( 'stored ', JSON.stringify( flickrAuth ), ' auth=', flickrAuth );
                    localStorage.setItem( 'flickrAuth', JSON.stringify( flickrAuth ) );

                    var frobRequestURL = localStorage.getItem( 'kkflickr_frobRequestURL' );
                    if ( frobRequestURL ) {
                        location.href = frobRequestURL;
                    }

                } else {
                    console.warn( ' error in data' );
                    injectKKFcode();
                    showButton( 'kkflickr_auth_btn' );
                }

            } )
            .catch( function ( err ) {
                console.error( 'Couldn\'t get Auth ', err );
            } );
    };

    /**
     * [ descrition]
     * @param  {[type]} ticketId [description]
     * @return {[type]}          [description]
     */
    var getPhotoId = function ( id, ticketId ) {

        fetch( cfg.baseURL + 'rest/' + signRequest( 'method=flickr.photos.upload.checkTickets&tickets=' + ticketId + '&nojsoncallback=1&format=json&auth_token=' + cfg.token ) )
            .then( function ( response ) {
                // Convert to JSON
                return response.json();
            } ).then( function ( json ) {

                if ( json.uploader.ticket[ 0 ].id === ticketId ) {
                    if ( json.uploader.ticket[ 0 ].complete === 1 ) {
                        // console.log( 'DONE id=', json.uploader.ticket[ 0 ].photoid );
                        getPhotoSizes( id, json.uploader.ticket[ 0 ].photoid );
                    } else {
                        // console.log( 'retrying…' );
                        setTimeout( function () {
                            getPhotoId( id, ticketId );
                        }, 1500 );
                    }
                }

            } ).catch( function ( err ) {
                console.error( 'Can\'t get photo id.', err );
            } );

    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var showButton = function ( id, retries ) {
        var btn = document.getElementById( id );
        if ( btn ) {
            btn.style.display = 'block';
        } else {

            if ( typeof retries === 'undefined' ) {
                retries = 10;
            } else {
                retries -= 1;
            }

            if ( retries === 0 ) {
                return;
            }

            setTimeout( function () {
                showButton( id, retries );
            }, 1500 );
        }
    };

    /**
     * [ description]
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    var checkAuth = function ( url ) {

        var savedAuth = localStorage.getItem( 'flickrAuth' );
        if ( savedAuth ) {

            // console.log( 'parsing ', savedAuth );
            try {
                savedAuth = JSON.parse( savedAuth );
            } catch ( e ) {
                savedAuth = {};
            }

            if ( savedAuth && savedAuth.token ) {
                // console.log( 'ffound saved auth data', savedAuth );
                cfg.token = savedAuth.token;
                injectKKFcode();
                showButton( 'kkflickr_upload_btn' );

                // restoring saved value if any
                var savedText = localStorage.getItem( 'kkflickr_savedText' );
                if ( savedText ) {
                    localStorage.setItem( 'kkflickr_savedText', null );
                    var textarea = document.querySelector( cfg.textareaSelector );
                    if ( textarea && textarea.value === '' && savedText !== null && savedText !== 'null' ) {
                        textarea.value = savedText;
                    }
                }

                return;
            }
        }

        if ( /frob=/.test( url ) ) {
            var frob = url.replace( /.*frob=(.*?)$|\?|\&/, '$1' );
            // console.log( 'GOT IT!!! FROB = ', frob );
            getAuthToken( frob );
        } else {
            injectKKFcode();
            showButton( 'kkflickr_auth_btn' );
        }
    };

    // reading settings
    chrome.storage.sync.get( {
        tags: {},
        pictureSize: '640',
        allowFullSize: false,
        isPrivate: '1'

    }, function ( newConfig ) {
        settings = newConfig;
    } );

    // checking FROB
    checkAuth( location.href );

    return;

}() );