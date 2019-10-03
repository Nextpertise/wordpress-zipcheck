console.info('Zipcheck input plugin loaded!');

let global_zipcode;

const zipcodeRegex = /([1-9][0-9]{3})\s*([a-zA-Z]{2})/;
const housenrRegex = /([0-9]+)[^a-zA-Z\n]?([a-zA-Z])*/;


jQuery(document).ready(function($) {
    // Sets the datalist specified by id to the array passed in as newData.
    function updateDataList(id, newData){
        let newDataListInnerHtml = "";
        $.each(newData, function(index, item){
            newDataListInnerHtml += "<option>" + item + "</option> ";
        });
        $("#" + id).html(newDataListInnerHtml);
    }

    // Gets the housenumber autocomplete/dropdown array and calls updateDataList with the new data.
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
    // Gets the housenumber extension autocomplete/dropdown array and calls updateDataList with the new data.
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
        updateDataList('zipcheck-housenumbers', data);
        inputContainer.removeClass('loader-active');
    }
    function updateExtCallback(data){
        let input = $('.zipcheck-ext');
        let inputContainer = input.parent();
        updateDataList('zipcheck-extensions', data);
        inputContainer.removeClass('loader-active');
    }

    // Adds the loadingbar.
    function beforeUpdateHouseNumber(){
        let input = $('.zipcheck-housenr');
        let inputContainer = input.parent();
        inputContainer.addClass('loader-active');
    }
    function beforeUpdateExt(){
        let input = $('.zipcheck-ext');
        let inputContainer = input.parent();
        inputContainer.addClass('loader-active');
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

    //Add listeners
    $('.zipcheck-zipcode').bind('input', function(event){
        let zipcode = $(this).val().replace(" ", "");
        $(this).val(zipcode);
        if(validateZipcode(zipcode)){
            beforeUpdateHouseNumber();
            //remove old data
            updateDataList('zipcheck-housenumbers', "");
            //get new data
            getAndUpdateHouseNumbers(zipcode, updateHouseNumberCallback);
            global_zipcode = zipcode;
        }
    });

    $('.zipcheck-housenr').change(function(){
        beforeUpdateExt();
        //remove old data
        updateDataList('zipcheck-extensions', "");

        //get new data
        let housenr = $(this).val();
        getAndUpdateExtensions(global_zipcode, housenr, updateExtCallback);
    });

    //Paste support
    function checkAndUsePastedData(paste){
        if(paste.length > 250){return false}
        
        // usedPaste is used to determine if the default event (paste) needs to be prevented.
        let usedPaste = false;

        // check zipcode
        let zipcodeMatch = paste.match(zipcodeRegex);
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

