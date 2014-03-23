/*global CryptoJS, CKEDITOR */

console.warn( '------------- flickr api loaded --------------' );

// document.addEventListener( 'DOMContentLoaded', function() {

( function() {

    'use strict';

    var cfg = {
        key: '1214d981477adc7e17d5c50ee0eef5bd',
        secret: '3db6fbef55dbdda6',
        baseURL: 'http://flickr.com/services/',
        preferredPhotoSize1: '640',
        preferredPhotoSize2: '800'
    };

    /**
     * [ description]
     * @param  {[type]} attempts [description]
     * @return {[type]}          [description]
     */
    var injectKKFcode = function( attempts ) {

        var e = document.getElementById( 'cke_vB_Editor_QR_editor' );

        if ( e === null ) {

            if ( typeof attempts === 'undefined' ) {
                attempts = 3;
            } else {
                attempts -= 1;
            }

            if ( attempts === 0 ) {
                return;
            }

            console.log( ' CANT FIND cke_vB_Editor_QR_editor ', e );
            setTimeout( function() {
                injectKKFcode( attempts );
            }, 2500 );

            return;
        }

        // progress holder
        var progressHolder = document.createElement( 'div' );
        progressHolder.setAttribute( 'id', 'kkflickr_progress' );
        progressHolder.innerHTML = '<div id="kkflickr_loading_holder" style="display: none">&nbsp;<div id="kkflickr_loading"><span id="kkflickr_loading1"></span><span id="kkflickr_loading2"></span></div></div>';
        e.parentNode.insertBefore( progressHolder, e );

        // toolbar button
        var holder = document.querySelector( '#cke_top_vB_Editor_QR_editor .cke_toolbox' );
        var toolbar = document.createElement( 'span' );
        toolbar.setAttribute( 'class', 'cke_toolbar' );
        toolbar.innerHTML =
            '<span class="cke_toolgroup">\
                    <span class="cke_button" style="display: none" id="kkflickr_auth_btn"></span>\
                    <span class="cke_button" style="display: none" id="kkflickr_upload_btn">\
                        <input type="file" id="kkflickrUploadInput" multiple="multiple" accept="image/*" />\
                        <span class="label"> </span>\
                    </span>\
                </span>';

        holder.appendChild( toolbar );

        document.getElementById( 'kkflickr_auth_btn' ).addEventListener( 'click', requestFrob, true );
        var uploadBtn = document.getElementById( 'kkflickr_upload_btn' );
        // uploadBtn.addEventListener('click', uploadDialog, true);
        uploadBtn.addEventListener( 'change', uploadDialog );

    };

    /**
     * [ description]
     * @param  {[type]} request [description]
     * @return {[type]}         [description]
     */
    var signRequest = function( request ) {

        var pairs = request.split( '&' );
        var params = [];
        var i;

        for ( i = 0; i < pairs.length; i++ ) {
            params.push( pairs[ i ].split( '=' ) );
        }
        params.push( [ 'api_key', cfg.key ] );

        var sorted = params.sort( function( a, b ) {
            if ( a[ 0 ] > b[ 0 ] )
                return 1;
            if ( a[ 0 ] < b[ 0 ] )
                return -1;
            return 0;
        } );

        var paramsString = cfg.secret;
        for ( i = 0; i < sorted.length; i++ ) {
            paramsString += '' + sorted[ i ][ 0 ] + sorted[ i ][ 1 ];
        }

        return '?api_key=' + cfg.key + '&' + request + '&api_sig=' + CryptoJS.MD5( paramsString );
    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var requestFrob = function() {
        localStorage.setItem( 'kkflickr_frobRequestURL', location.href );

        var textarea = document.querySelector( '#cke_contents_vB_Editor_QR_editor textarea' );
        if (textarea) {
            localStorage.setItem( 'kkflickr_savedText', textarea.value );
        }

        location.href = cfg.baseURL + 'auth/' + signRequest( 'perms=write' );
    };

    /**
     * [ description]
     * @param  {[type]} id       [description]
     * @param  {[type]} text     [description]
     * @param  {[type]} progress [description]
     * @return {[type]}          [description]
     */
    var updateProgress = function( id, status, progress, text ) {

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
            document.getElementById('kkflickr_loading_holder').style.display = 'block';

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
    var uploadPhoto = function( id, photo ) {

        var resultFired = false;
        console.log( 'uploading photo id=', id );

        var formData = new FormData();
        formData.append( 'photo', photo );

        // encoding params
        var params = signRequest( 'title=' + photo.name + '&hidden=2&async=1&is_public=0&auth_token=' + cfg.token ).replace( /^\?/, '' ).split( '&' );

        for ( var i = 0; i < params.length; i++ ) {
            var pair = params[ i ].split( '=' );
            formData.append( pair[ 0 ], pair[ 1 ] );
        }

        var xhr = new XMLHttpRequest();

        // progress indicator
        xhr.upload.addEventListener( 'progress', function( progress ) {
            var perc = Math.round( progress.loaded * 100 / progress.totalSize );
            console.log( ' progress = ', perc, '%' );
            updateProgress( id, 'uploading', perc );
        }, false );

        xhr.addEventListener( 'readystatechange', function( evt ) {

            if ( !evt || !evt.target ) {
                return;
            }

            if ( !resultFired && evt.target.readyState === 4 ) {
                resultFired = true;
                console.log( evt, evt.target.responseText );

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


    /**
     * [ description]
     * @return {[type]} [description]
     */
    var uploadDialog = function() {

        var photos = document.getElementById( 'kkflickrUploadInput' ).files;

        for ( var i = 0, len = photos.length; i < len; i++ ) {
            var photo = photos[ i ];
            var id = CryptoJS.MD5( photo.name + photo.size + Date.now() ).toString();

            updateProgress( id, 'preparing', 0, photo.name );
            // console.log( id, 'preparing', 0, photo.name, ' ===', photo  );
            uploadPhoto( id, photo );
        }
    };

    /**
     * [ description]
     * @param  {[type]} photoId [description]
     * @return {[type]}         [description]
     */
    var getPhotoSizes = function( id, photoId ) {

        var xhr = new XMLHttpRequest();

        updateProgress( id, 'getting photo URL' );

        xhr.addEventListener( 'readystatechange', function( evt ) {

            if ( !evt || !evt.target ) {
                return;
            }

            if ( evt.target.readyState === 4 ) {

                try {

                    var response = JSON.parse( evt.target.responseText );
                    console.log( 'SIZES', response );

                    var ffoundRightSize = false;

                    for ( var i = 0, len = response.sizes.size.length; i < len; i++ ) {
                        if ( response.sizes.size[ i ].width === cfg.preferredPhotoSize1 || response.sizes.size[ i ].width === cfg.preferredPhotoSize2 ) {
                            console.log( 'Direct photo url ', response.sizes.size[ i ].source );
                            postResult( id, response.sizes.size[ i ].source );
                            ffoundRightSize = true;
                            break;
                        }
                    }

                    if ( !ffoundRightSize && response.sizes.size.length > 0 ) {
                        postResult( id, response.sizes.size[ 0 ].source );
                    }



                } catch ( e ) {
                    console.error( e );
                }

            }

        } );

        xhr.open( 'get', cfg.baseURL + 'rest/' + signRequest( 'method=flickr.photos.getSizes&photo_id=' + photoId + '&nojsoncallback=1&format=json&auth_token=' + cfg.token ), true );
        xhr.send();

    };

    /**
     * [ description]
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    var postResult = function( id, url ) {

        updateProgress( id, 'DONE' );

        var holder = document.querySelector( '#cke_contents_vB_Editor_QR_editor textarea' );
        holder.value += "\n" + '[IMG]' + url + '[/IMG]';

        // let's remove finished items after timeout
        setTimeout( function() {

            var holder = document.getElementById( 'kkflickr_' + id );

            if ( holder ) {
                var parent = holder.parentNode;
                parent.removeChild( holder );

                if (parent.childNodes.length === 1 ) {
                    document.getElementById('kkflickr_loading_holder').style.display = 'none';
                }

            }

        }, 2000 );

    };

    /**
     * [ description]
     * @param  {[type]} frob [description]
     * @return {[type]}      [description]
     */
    var getAuthToken = function( frob ) {

        var xhr = new XMLHttpRequest();

        xhr.addEventListener( 'readystatechange', function( evt ) {

            if ( !evt || !evt.target ) {
                return;
            }

            if ( evt.target.readyState === 4 ) {

                try {

                    var data = JSON.parse( evt.target.responseText );

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
                        console.log( 'stored ', JSON.stringify( flickrAuth ), ' auth=', flickrAuth );
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

                } catch ( e ) {
                    console.error( e );
                }
            }

        } );

        xhr.open( 'get', cfg.baseURL + 'rest/' + signRequest( 'method=flickr.auth.getToken&nojsoncallback=1&format=json&frob=' + frob ), true );
        xhr.send();
    };

    /**
     * [ descrition]
     * @param  {[type]} ticketId [description]
     * @return {[type]}          [description]
     */
    var getPhotoId = function( id, ticketId ) {

        var xhr = new XMLHttpRequest();

        updateProgress( id, 'processing' );

        xhr.addEventListener( 'readystatechange', function( evt ) {

            if ( !evt || !evt.target ) {
                return;
            }

            if ( evt.target.readyState === 4 ) {

                try {

                    var response = JSON.parse( evt.target.responseText );
                    console.log( response );

                    if ( response.uploader.ticket[ 0 ].id === ticketId ) {

                        if ( response.uploader.ticket[ 0 ].complete === 1 ) {
                            console.log( 'DONE id=', response.uploader.ticket[ 0 ].photoid );

                            getPhotoSizes( id, response.uploader.ticket[ 0 ].photoid );

                        } else {
                            console.log( 'retrying…' );
                            setTimeout( function() {
                                getPhotoId( id, ticketId );
                            }, 2000 );
                        }
                    }

                } catch ( e ) {
                    console.error( e );
                }

            }

        } );

        xhr.open( 'get', cfg.baseURL + 'rest/' + signRequest( 'method=flickr.photos.upload.checkTickets&tickets=' + ticketId + '&nojsoncallback=1&format=json&auth_token=' + cfg.token ), true );
        xhr.send();

    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var showButton = function( id, retries ) {
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

            setTimeout( function() {
                showButton( id, retries );
            }, 1500 );
        }
    };

    /**
     * [ description]
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    var checkAuth = function( url ) {

        var savedAuth = localStorage.getItem( 'flickrAuth' );
        if ( savedAuth ) {

            console.log( 'parsing ', savedAuth );
            try {
                savedAuth = JSON.parse( savedAuth );
            } catch ( e ) {
                savedAuth = {};
            }

            if ( savedAuth && savedAuth.token ) {
                console.log( 'ffound saved auth data', savedAuth );
                cfg.token = savedAuth.token;
                injectKKFcode();
                showButton( 'kkflickr_upload_btn' );

                // restoring saved value if any
                var savedText = localStorage.getItem( 'kkflickr_savedText');
                if (savedText) {
                    localStorage.setItem( 'kkflickr_savedText', null);
                    var textarea = document.querySelector( '#cke_contents_vB_Editor_QR_editor textarea' );
                    if (textarea && textarea.value === '') {
                        textarea.value = savedText;
                    }
                }

                return;
            }
        }

        if ( /frob=/.test( url ) ) {
            var frob = url.replace( /.*frob=(.*?)$|\?|\&/, '$1' );
            console.log( 'GOT IT!!! FROB = ', frob );
            getAuthToken( frob );

        } else {

            injectKKFcode();
            showButton( 'kkflickr_auth_btn' );
        }
    };

    // checking FROB
    checkAuth( location.href );

    return;

}() );

// }, false );