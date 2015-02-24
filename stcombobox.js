/** @license STComboBox (c) 2015 Jason Jones (simpletutorials.com), MIT License

 debounce() and now() functions from:
 Underscore.js 1.7.0
 http://underscorejs.org
 (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 Underscore may be freely distributed under the MIT license.

 A filtering method by sod (a user) on http://stackoverflow.com/a/3976066 was also used
 */
var STComboBox = (function($) {
    //constructor is intentionally empty (creating a "class" for overriding)
    var Class = function() {};

    //this is just a convenience function for selecting by ID
    var j$ = function(id) {
        return $('#' + id);
    };

    var keycodes = {
        up: 38,
        down: 40,
        enter: 13
    };

    //Copied from the UnderscoreJS library
    var now = Date.now || function() {
        return new Date().getTime();
    };

    //Copied from the UnderscoreJS library
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    var debounce = function(func, wait, immediate) {
        var timeout, args, context, timestamp, result;

        var later = function() {
            var last = now() - timestamp;

            if (last < wait && last > 0) {
                timeout = setTimeout(later, wait - last);
            } else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                }
            }
        };

        return function() {
            context = this;
            args = arguments;
            timestamp = now();
            var callNow = immediate && !timeout;
            if (!timeout) timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(context, args);
                context = args = null;
            }

            return result;
        };
    };

    //Initialize the dialog. This function is used in place of a constructor so that
    //the functionality could be easily overriden by a child class
    Class.prototype.Init = function(containerId) {
        this.containerId = containerId;
        var c$ = j$(containerId);
        c$.html(this.getHtml(containerId));
        var self = this;
        c$.find('.stc-button').on('click', function(evt) { //event for clicking on the combobox button
            self.toggleList();
            self.getInput().focus();
        });
        $(document).on('click', function(evt) { //event for clicking on the page, not on the combo box
            var id = evt.target.id;
            if(id != self.getId('ddi') && (id != self.getId('ddbutton'))) {
                self.hideList();
            }
        });
        this.getInput().on('keydown', function(evt) {
            self.onKeyDown(evt);
        }).on('focus', function(evt) {
            self.onShowList(evt);
        }).on('click', function(evt) {
            if(self.$('ddl').css('display') == 'none') {
                self.getInput().focus();
            }
        });
    };

    //Filter the list and reset the selected index
    Class.prototype.filterAndResetSelected = function() {
        var inputValue = this.$('ddi').val();

        if(!inputValue) {
            this.selectRow(0, 0);
            return;
        }
        this.$('ddi').val('');
        this.restoreAllRows();
        this.deselectRow();

        this.visibleRows = this.getDomRows();

        if(inputValue && typeof(this.valueMap[inputValue]) != 'undefined') {
            this.selectRow(this.valueMap[inputValue], 0);
        } else {
            this.selectRow(0, 0);
        }
    };

    //Event for when the input box inside the combo box receives focus
    Class.prototype.onShowList = function() {
        this.showList();
        this.filterAndResetSelected();
    };

    //Handler for when a keydown event is triggered inside the combo box
    Class.prototype.onKeyDown = function(evt) {
        if(evt.which == keycodes.enter) {
            var rows = this.getVisibleDomRows();
            var selectedIndex = $(rows[this.selectedIndex]).attr('data-stc-id')*1;
            this.$('ddi').val(this.data[selectedIndex].text);
            this.hideList();
            return false;
        }

        if(evt.which == keycodes.down) {
            var $list = this.$('ddl');
            if($list.css('display') == 'none') {
                this.onShowList();
                return false;
            }

            if(this.selectedIndex < (this.visibleRows.length-1)) {
                this.deselectRow();
                this.selectRow(++this.selectedIndex, 2);
            }
            return false;
        }

        if(evt.which == keycodes.up) {
            evt.stopPropagation();
            if(this.selectedIndex > 0) {
                this.deselectRow();
                this.selectRow(--this.selectedIndex, 1);
            } else {
                this.deselectRow(-1);
            }
            return false;
        }
        this.showAndFilterList();
    };

    //Show the list of items and hide the items that don't fit the filter criteria
    Class.prototype.showAndFilterList = debounce(function() {
        this.showList();
        this.deselectRow();
        this.filterList(this.getInput().val());
        //this.selectedIndex = -1;
        this.selectRow(0, 0);
    }, 200);

    //This is just a convenience function to shorten the selecting of DOM objects
    Class.prototype.$ = function(suffix) {
        return j$(this.containerId + '-' + suffix);
    };

    //Convenience function for getting the IDs of combobox DOM objects
    Class.prototype.getId = function(suffix) {
        return this.containerId + '-' + suffix;
    };

    //Deselect a row in the grid, and set the "selected" index if the optional index
    //parameter is passed
    Class.prototype.deselectRow = function(selectedIndex) {
        this.$('ddl').find('.stc-lrow-hl').removeClass('stc-lrow-hl');

        if(selectedIndex) {
            this.selectedIndex = selectedIndex;
        }
    };

    //Select a row in the list of items that appears (e.g. when clicking the combo box button)
    Class.prototype.selectRow = function(index, context) {
        var rows = this.getVisibleDomRows();

        if(rows.length == 0 || (index >= (rows.length))) {
            return;
        }
        $(rows[index]).addClass('stc-lrow-hl');

        this.selectedIndex = index;

        var $listContainer = this.$('ddl');

        if(index == 0) {
            $listContainer.scrollTop(0);
            return;
        }
        var scrollTop = $listContainer.scrollTop();
        var containerHeight = $listContainer.height();
        var scrollBottom = scrollTop + containerHeight;

        var $row = $(rows[index]);
        var rowHeight = $row.outerHeight();
        var rowPos = $row.position();

        switch(context) {
            case 0:
                $listContainer.scrollTop(rowPos.top); //just move to the item
                break;
            case 1:
                if(rowPos.top < scrollTop) { //the user is moving up
                    $listContainer.scrollTop(rowPos.top);
                }
                break;
            case 2:
                if((rowPos.top + rowHeight) > scrollBottom) { //the user is moving down
                    $listContainer.scrollTop(scrollTop + rowHeight);
                }
                break;
        }
    };

    //make all rows visible
    Class.prototype.restoreAllRows = function() {
        var rows = this.getDomRows();

        for(var i=0; i < rows.length; i++) {
            $(rows[i]).show().removeClass('stc-lrow-odd').toggleClass('stc-lrow-odd', i%2 == 1);
        }
    };

    //use filtering method from: http://stackoverflow.com/a/3976066
    Class.prototype.filterList = function(value) {
        var filteredRows = this.getFilteredRows(value);
        var rows = this.getDomRows();

        for(var i=0, j=0; i < rows.length; i++) {
            $(rows[i]).toggle(i in filteredRows).removeClass('stc-lrow-odd').toggleClass('stc-lrow-odd', j%2 == 1);

            if(i in filteredRows) {
                j++;
            }
        }
    };

    //Get the DOM objects for each row (<tr>) in the list of items
    Class.prototype.getDomRows = function() {
        return this.$('ddlt')[0].rows;
    };

    //Get the DOM objects for each row (<tr>) that is visible to the user (since we're filtering)
    Class.prototype.getVisibleDomRows = function() {
        return this.visibleRows;
    };

    //Get information about the (filtered) rows we need to show. Assemble the array
    //of visible row (<tr>) DOM objects
    Class.prototype.getFilteredRows = function(value) {
        var r = new RegExp('(\\d+)`([^#]*' + value + '[^#]*)#', 'gi');

        var showRows = {};
        var match = null;
        this.visibleRows = [];
        var rows = this.getDomRows();
        while(match = r.exec(this.filterCache)) {
            var rowNum = match[1]*1;
            this.visibleRows.push(rows[rowNum]);
            showRows[rowNum] = 0;
        }
        return showRows;
    };

    //Hide the list of combo box items
    Class.prototype.hideList = function() {
        this.$('ddl').hide();
    };

    //Show the list of combo box items
    Class.prototype.showList = function() {
        var $table = this.$('ddt');
        var pos = $table.position();
        var top =  $table.outerHeight() + pos.top;
        var borderWidth = 2;
        this.$('ddl').css({
            top: top + 'px',
            left: pos.left,
            width: (this.$('ddb').width()-borderWidth) + 'px'
        }).show();
    };

    //Toggle visibility of the list of combo box items
    Class.prototype.toggleList = function() {
        if(this.$('ddl').is(':visible')) {
            this.hideList();
            return;
        }
        this.showList();
    };

    //Populate the combo box items from a data array
    Class.prototype.populateList = function(data) {
        this.data = data;
        this.filterCache = '';
        for(var i=0; i < data.length; i++) {
            this.filterCache += i + '`' + data[i].text + '#';
        }

        var $list = this.$('ddl');

        $list.html(this.getListHtml(data));

        var self = this;
        //add list item hover effect, and setup row click handler
        $list.find('.stc-lrow').hover(function() {
            $(this).addClass('stc-lrow-hover');
        }, function() {
            $(this).removeClass('stc-lrow-hover');
        }).on('click', function() {
            var selectedIndex = $(this).attr('data-stc-id')*1;
            self.getInput().val(self.data[selectedIndex].text);
        });
        this.visibleRows = this.getDomRows();
        this.selectedIndex = -1;
    };

    //Get the combo box <input> DOM element
    Class.prototype.getInput = function() {
        return this.$('ddi');
    };

    //Create and return the combo box's list of items (in HTML)
    Class.prototype.getListHtml = function(data) {
        var containerId = this.containerId;
        var html = '<table cellspacing="0" cellpadding="0" class="stc-ltable" id="' + containerId + '-ddlt">';

        this.valueMap = {};
        for(var i=0; i < data.length; i++) {
            var d = data[i];
            var oddRow = (i % 2) ? 'stc-lrow-odd' : '';
            html += '<tr class="stc-lrow ' + oddRow + '" data-stc-id="' + d.id + '">'
                  + '<td>'
                  + '<span class="stc-text" id="' + containerId + '-ddtext' + i + '">' + d.text + '</span>'
                  + '</td>'
                  + '</tr>';
            this.valueMap[d.text] = i;
        }
        html += '</table>';
        return html;
    };

    //Get the HTML that draws the combo box frame (the input element, "button" (<td>), and
    //frame for the list of items)
    Class.prototype.getHtml = function(containerId) {
        return '<span class="stc-box" id="' + containerId + '-ddb">'
             + '<table cellspacing="0" cellpadding="0" class="stc-table" id="' + containerId + '-ddt">'
             + '<tr>'
             + ' <td><input type="text" class="stc-input" id="' + containerId + '-ddi"/></td>'
             + ' <td class="stc-button" id="' + containerId + '-ddbutton"></td>'
             + '</tr>'
             + '</table>'
             + '<div id="' + containerId + '-ddl" class="stc-lc" style="display: none"></div>'
             + '</span>';
    };
    return Class;
})($);
