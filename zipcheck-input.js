console.info('Zipcheck input plugin loaded!');

// State vars
let global_zipcode;
let global_housenr_zipcode;
let global_housenr;

const zipcodeRegex = /([1-9][0-9]{3})\s*([a-zA-Z]{2})/;
const zipcodeStartRegex = /([1-9][0-9]{3})/
const housenrRegex = /([0-9]+)[^a-zA-Z\n]?([a-zA-Z])*/;


jQuery(document).ready(function($) {
    // Gets the housenumber autocomplete/dropdown array and calls callback with the new data.
    // Using callback because normal async/await is not properly supported on all browsers.
    function getAndUpdateHouseNumbers(zipcode, callback){
        $.ajax(zipcheck_ajax.ajax_url, {
            method: 'POST',
            data: {'action': 'nextzipcheck_get_housenr', 'zipcode': zipcode},
            success: function(data){
                callback(JSON.parse(data));
            }
        })
    }
    // Gets the housenumber extension autocomplete/dropdown array and calls callback with the new data.
    // Using callback because normal async/await is not properly supported on all browsers.
    function getAndUpdateExtensions(zipcode, housenr, callback){
        $.ajax(zipcheck_ajax.ajax_url, {
            method: 'POST',
            data: {'action': 'nextzipcheck_get_housenrext', 'zipcode': zipcode, 'housenr': housenr},
            success: function(data){
                callback(JSON.parse(data));
            }
        })
    }

    // Removes the loadingbar.
    function updateHouseNumberCallback(data){
        let input = $('.zipcheck-housenr');
        let inputContainer = input.parent();
        autocomplete($("input.zipcheck-housenr")[0], data);
        inputContainer.removeClass('loader-active');
    }
    function updateExtCallback(data){
        let input = $('.zipcheck-ext');
        let inputContainer = input.parent();
        autocomplete($("input.zipcheck-ext")[0], data);
        inputContainer.removeClass('loader-active');
    }

    // Adds the loadingbar and removes old autocompletes..
    function beforeUpdateHouseNumber(){
        let input = $('input.zipcheck-housenr');
        let inputContainer = input.parent();
        inputContainer.addClass('loader-active');
        autocomplete(input[0], false);
    }
    function beforeUpdateExt(){
        let input = $('input.zipcheck-ext');
        let inputContainer = input.parent();
        inputContainer.addClass('loader-active');
        autocomplete(input[0], false);
    }

    // Validate input
    function validateZipcode(zipcode){
        zipcode = $.trim(zipcode);
        if(zipcode.length < 6){
            return false;    
        }
        return zipcodeRegex.test(zipcode);
    }

    function validateHousenr(housenr){
        housenr = $.trim(housenr);
    }

    // Add listeners
    $('.zipcheck-zipcode').bind('input', function(event){
        let zipcode = $(this).val().replace(" ", "");
        $(this).val(zipcode);
        if(validateZipcode(zipcode)){
            beforeUpdateHouseNumber();
            getAndUpdateHouseNumbers(zipcode, updateHouseNumberCallback);
            global_zipcode = zipcode;
        }
    });
    $('.zipcheck-housenr').change(function(){
        let housenr = $(this).val();
        if(housenr !== global_housenr || global_zipcode !== global_housenr_zipcode){
            global_housenr = housenr;
            global_housenr_zipcode = global_zipcode;
            beforeUpdateExt();
            getAndUpdateExtensions(global_zipcode, housenr, updateExtCallback);
        }
    });



    // Paste support
    function checkAndUsePastedData(paste){
        if(paste.length > 250){return false}
        
        // usedPaste is used to determine if the default event (paste) needs to be prevented.
        let usedPaste = false;

        // check zipcode
        let zipcodeMatch = paste.match(zipcodeRegex) || paste.match(zipcodeStartRegex);
        if(zipcodeMatch !== null){
            $('input.zipcheck-zipcode').val(zipcodeMatch[0]).trigger('input');
            paste = paste.replace(new RegExp(zipcodeMatch[0].trim(), "gi"), "");
            usedPaste = true;
        }

        // Checks for housenrs with and without extensions;
        let housenrMatch = paste.match(housenrRegex);
        if(housenrMatch !== null){
            usedPaste = true;
            $('input.zipcheck-housenr').val(housenrMatch[1]).trigger('change'); 
            // found extension
            if(housenrMatch.length > 2){
                $('input.zipcheck-ext').val(housenrMatch[2]);
            }
        }
        
        return usedPaste;
        
    }

    $("body").on("paste", function(event){
        let pastedData = event.originalEvent.clipboardData.getData('text');
        if(checkAndUsePastedData(pastedData)){
            event.preventDefault();
        };
    });

});

