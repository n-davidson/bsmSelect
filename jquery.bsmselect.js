/*
 * Better Select Multiple - jQuery Plugin
 *
 * based on Alternate Select Multiple (asmSelect) 1.0.4a beta (http://www.ryancramer.com/projects/asmselect/)
 * 
 * Copyright (c) 2009 by Ryan Cramer - http://www.ryancramer.com
 * Copyright (c) 2010 by Victor Berchet - http://www.github.com/vicb
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
 *
 * bsmSelect version: v1.2.0 - 2010-08-13
 */

(function($) {

  function BsmSelect(target, options)
  {
    this.$original = $(target);             // the original select multiple
    this.$container = null;                 // a container that is wrapped around our widget
    this.$select = null;                    // the new select we have created
    this.$ol = null;                        // the list that we are manipulating
    this.buildingSelect = false;            // is the new select being constructed right now?
    this.ieClick = false;                   // in IE, has a click event occurred? ignore if not
    this.ignoreOriginalChangeEvent = false; // originalChangeEvent bypassed when this is true
    this.uid = 0;                           // bsmSelect uid
    this.optIndex = 0;                      // option index
    this.options = options;

    this.buildDom();
  }

  BsmSelect.prototype = {

    /**
     * Build the DOM for bsmSelect
     */
    buildDom: function() {
      var self = this, o = this.options;

      // This loop ensures uniqueness, in case of existing bsmSelects placed by ajax
      while($('#' + o.containerClass + this.uid).size()) { this.uid++; }


      this.$select = $('<select>', {
        'class': o.selectClass,
        name: o.selectClass + this.uid,
        id: o.selectClass + this.uid,
        change: function(e) { self.selectChangeEvent.call(self, e);},
        click: function(e) { self.selectClickEvent.call(self, e);}
      });

      if ($.isFunction(o.listType)) {
        this.$ol = o.listType(this.$original);
      } else {
        this.$ol = $('<' + o.listType + '>', { id: o.listClass + this.uid });
      }
      
      this.$ol.addClass(o.listClass);

      this.$container = $('<div>', {
        'class':  o.containerClass,
        id: o.containerClass + this.uid
      });

      this.buildSelect();

      this.$original
        .change(function(e) { self.originalChangeEvent.call(self, e);})
        .wrap(this.$container)
        .before(this.$select);

      // if the list isn't already in the document, add it (it might be inserted by a custom callback)
      if (!this.$ol.parent().length) { this.$original.before(this.$ol); }

      if (this.$original.attr('id').length) {
        $('label[for=' + this.$original.attr('id') + ']').attr('for', this.$select.attr('id'));
      }

      // set up remove event (may be a link, or the list item itself)
      this.$ol.delegate('.' + o.removeClass, 'click', function() {
        self.dropListItem($(this).closest('li').attr('rel'));
        return false;
      });
      
    },

    /**
     * Triggered when an item has been selected
     * Check to make sure it's not an IE screwup, and add it to the list
     */
    selectChangeEvent: function() {
      if ($.browser.msie && $.browser.version < 7 && !this.ieClick) { return; }
      var id = $('option:selected:eq(0)', this.$select).attr('rel');
      if (id) {
        this.addListItem(id);
        this.ieClick = false;
        this.triggerOriginalChange(id, 'add'); // for use by user-defined callbacks
      }
    },

    /**
     * IE6 lets you scroll around in a select without it being pulled down
     * making sure a click preceded the change() event reduces the chance
     * if unintended items being added. there may be a better solution?
     */
    selectClickEvent: function() {

      this.ieClick = true;
    },

    /**
     * Rebuild bsmSelect when the 'change' event is triggered on the original select
     */
    originalChangeEvent: function() {
      if (this.ignoreOriginalChangeEvent) {
        // We don't want to rebuild everything when an item is added / droped
        this.ignoreOriginalChangeEvent = false;
      } else {
        this.buildSelect();
        // opera has an issue where it needs a force redraw, otherwise
        // the items won't appear until something else forces a redraw
        if ($.browser.opera) { this.$ol.hide().fadeIn('fast'); }
      }
    },

    /**
     * Build the DOM for the new select
     */
    buildSelect: function() {
      var self = this;

      this.buildingSelect = true;
      this.optIndex = 0;

      // add a first option to be the home option / default selectLabel
      this.$select.empty().prepend($('<option value="">').text(this.$original.attr('title') || this.options.title));
      this.$ol.empty();

      this.$original.children().each(function() {
        if ($(this).is('option')) {
          self.addSelectOption(self.$select, $(this));
        } else if ($(this).is('optgroup')) {
          self.addSelectOptionGroup(self.$select, $(this));
        }
      });

      if (!this.options.debugMode) { this.$original.hide(); } // IE6 requires this on every buildSelect()
      this.selectFirstItem();
      this.buildingSelect = false;
    },

    /**
     * Add a select option to the parent (either select or optgroup)
     */
     addSelectOption: function ($parent, $option) {
      if (!$option.attr('id')) { $option.attr('id', 'bsm' + this.uid + 'option' + this.optIndex); }
      var id = $option.attr('id');

      var $O = $('<option>', {
        text: $option.text(),
        val: $option.val(),
        rel: id
      }).appendTo($parent);

      var isSelected = $option.is(':selected'), isDisabled = $option.is(':disabled');

      if (isSelected && !isDisabled) {
        this.addListItem(id);
        this.disableSelectOption($O);
      } else if (!isSelected &&  isDisabled) {
        this.disableSelectOption($O);
      }

      this.optIndex++;
    },

    /**
     * Add the option group to the parent
     */
    addSelectOptionGroup: function($parent, $group)
    {
      var $G = $('<optgroup>', { label: $group.attr('label')} ).appendTo($parent),
        self = this;
      if ($group.is(':disabled')) { $G.attr('disabled', 'disabled'); }
      $group.find('option').each(function(i, option) {
        self.addSelectOption($G, $(option));
      });
    },

    /**
     * Select the first item of the new select
     */
    selectFirstItem: function() {
      $('option:eq(0)', this.$select).attr('selected', 'selected');
    },

    /**
     * Make an option disabled, indicating that it's already been selected
     * because safari is the only browser that makes disabled items look 'disabled'
     * we apply a class that reproduces the disabled look in other browsers
     */
    disableSelectOption: function($option) {
      $option.addClass(this.options.optionDisabledClass)
        .removeAttr('selected')
        .attr('disabled', 'disabled');

      if (this.options.hideWhenAdded) { $option.hide(); }
      if ($.browser.msie) { this.$select.hide().show(); } // this forces IE to update display
    },

    /**
     * Enable a select option
     */
    enableSelectOption: function($option) {
      $option.removeClass(this.options.optionDisabledClass).removeAttr('disabled');
      if (this.options.hideWhenAdded) { $option.show(); }
      if ($.browser.msie) { this.$select.hide().show(); } // this forces IE to update display
    },

    /**
     * Add an item to the list of selection
     */
    addListItem: function(optionId) {
      var $O = $('#' + optionId), o = this.options;

      if (!$O) { return; } // this is the first item, selectLabel

      if (!this.buildingSelect) {
        if ($O.is(':selected')) { return; } // already have it
        $O.attr('selected', 'selected');
      }

      var $removeLink = $('<a>', {
        href: '#',
        'class': o.removeClass
      }).prepend(o.removeLabel);

      var $itemLabel = $('<span>', {
        'class': o.listItemLabelClass,
        html: o.extractLabel($O, o)
      });

      var $item = $('<li>', {
        rel:  optionId,
        'class': o.listItemClass
      }).append($itemLabel)
        .append($removeLink)
        .hide();

      this.$ol[o.addItemTarget == 'top' && !this.buildingSelect?'prepend':'append']($item);

      this.showListItem($item);

      this.disableSelectOption($('[rel=' + optionId + ']', this.$select));

      if (!this.buildingSelect) {
        this.highlight($item, o.highlightAddedLabel);
        this.selectFirstItem();
      }
    },

    /**
     * Reveal the currently hidden item with optional animation
     */
    showListItem: function($item) {
      var fx = this.options.animate;
      if (!this.buildingSelect) {
        if (fx === true) {
          $.fn.bsmSelect.effects.verticalListAdd($item);
        } else if ($.isFunction(fx.add)) {
          fx.add($item);
        } else if (typeof(fx.add) == 'string' && $.isFunction($.fn.bsmSelect.effects[fx.add])) {
          $.fn.bsmSelect.effects[fx.add]($item);
        } else {
          $item.show();
        }
      } else {
        $item.show();
      }
    },

    /**
     * Remove an item from the list of selection
     */
    dropListItem: function(optionId) {
      var $O = $('#' + optionId);
      $O.removeAttr('selected');
      var $item = this.$ol.children('li[rel=' + optionId + ']');
      this.hideListItem($item);
      this.enableSelectOption($('[rel=' + optionId + ']', this.$select));
      this.highlight($item, this.options.highlightRemovedLabel);
      this.triggerOriginalChange(optionId, 'drop');
    },

    /**
     * Remove the currently visible item with optional animation
     */
    hideListItem: function($item) {
      var fx = this.options.animate;
      if (!this.buildingSelect) {
        if (fx === true) {
          $.fn.bsmSelect.effects.verticalListRemove($item);
        } else if ($.isFunction(fx.drop)) {
          fx.drop($item);
        } else if (typeof(fx.drop) == 'string' && $.isFunction($.fn.bsmSelect.effects[fx.drop])) {
          $.fn.bsmSelect.effects[fx.drop]($item);
        } else {
          $item.remove();
        }
      } else {
        $item.remove();
      }
    },

    highlight: function($item, label) {
      var fx = this.options.highlight;
      if (fx === true) {
        $.fn.bsmSelect.effects.highlight(this.$select, $item, label, this.options);
      } else if ($.isFunction(fx)) {
        fx(this.$select.$item, label, this.options);
      } else if (typeof(fx) == 'string' && $.isFunction($.fn.bsmSelect.effects[fx])) {
        $.fn.bsmSelect.effects[fx](this.$select, $item, label, this.options);
      }
    },

    /**
     * Trigger a change event on the original select multiple
     * so that other scripts can pick them up
     */
    triggerOriginalChange: function(optionId, type) {
      this.ignoreOriginalChangeEvent = true;
      var $option = $('#' + optionId);
      this.$original.trigger('change', [{
        'option': $option,
        'value': $option.val(),
        'id': optionId,
        'item': this.$ol.children('[rel=' + optionId + ']'),
        'type': type
      }]);
    }
  };

  $.fn.bsmSelect = function(customOptions) {
    var options = $.extend({}, $.fn.bsmSelect.conf, customOptions);

    return this.each(function() {
      var bsm = $(this).data("bsmSelect");
      if (!bsm)
      {
        bsm = new BsmSelect($(this), options);
        $(this).data("bsmSelect", bsm);
      }
    });
  };
  
  $.extend($.fn.bsmSelect, {
    // Default configuration
    conf: {
      listType: 'ol',                             // Ordered list 'ol', or unordered list 'ul'
      highlight: false,                           // Use the highlight feature?
      animate: false,                             // Animate the the adding/removing of items in the list?
      addItemTarget: 'bottom',                    // Where to place new selected items in list: top or bottom
      hideWhenAdded: false,                       // Hide the option when added to the list? works only in FF
      debugMode: false,                           // Debug mode keeps original select visible

      title: 'Select...',                         // Text used for the default select label
      removeLabel: 'remove',                      // Text used in the 'remove' link
      highlightAddedLabel: 'Added: ',             // Text that precedes highlight of added item
      highlightRemovedLabel: 'Removed: ',         // Text that precedes highlight of removed item
      extractLabel: function($option) { return $option.html(); },

      containerClass: 'bsmContainer',             // Class for container that wraps this widget
      selectClass: 'bsmSelect',                   // Class for the newly created <select>
      optionDisabledClass: 'bsmOptionDisabled',   // Class for items that are already selected / disabled
      listClass: 'bsmList',                       // Class for the list ($ol)
      listItemClass: 'bsmListItem',               // Class for the <li> list items
      listItemLabelClass: 'bsmListItemLabel',     // Class for the label text that appears in list items
      removeClass: 'bsmListItemRemove',           // Class given to the 'remove' link
      highlightClass: 'bsmHighlight'              // Class given to the highlight <span>
    },
    effects: {
      highlight: function ($select, $item, label, conf) {
        $select.next('#' + conf.highlightClass + this.uid).remove();
        var $highlight = $('<span>', {
          'class': conf.highlightClass,
          id: conf.highlightClass + this.uid,
          html: label + $item.children('.' + conf.listItemLabelClass).eq(0).text()
        }).hide();

        $select.after($highlight.fadeIn('fast').delay(50).fadeOut('slow', function() { $(this).remove(); }));
      },
      verticalListAdd: function ($el) {
        $el.animate({
          opacity: 'show',
          height: 'show'
        }, 100, 'swing', function() {
          $el.animate({
            height: '+=2px'
          }, 50, 'swing', function() {
            $el.animate({
              height: '-=2px'
            }, 25, 'swing');
          });
        });
      },
      verticalListRemove: function($el) {
        var $prevItem = $el.prev('li');
        $el.animate({
          opacity: 'hide',
          height: 'hide'
        }, 100, 'linear', function() {
          $prevItem.animate({
            height: '-=2px'
          }, 50, 'swing', function() {
            $prevItem.animate({
              height: '+=2px'
            }, 100, 'swing');
          });
          $el.remove();
        });
      }
    }
  });

})(jQuery);
