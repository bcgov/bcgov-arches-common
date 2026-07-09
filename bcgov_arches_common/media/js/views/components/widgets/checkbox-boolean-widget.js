import _ from 'underscore';
import ko from 'knockout';
import BooleanCheckboxWidgetViewModel from 'viewmodels/checkbox-boolean-widget';
import checkboxBooleanWidgetTemplate from 'templates/views/components/widgets/checkbox-boolean.htm';
/**
 * knockout components namespace used in arches
 * @external "ko.components"
 * @see http://knockoutjs.com/documentation/component-binding.html
 */

/**
 * registers a radio-boolean-widget component for use in forms
 * @function external:"ko.components".radio-boolean-widget
 * @param {object} params
 * @param {boolean} params.value - the value being managed
 * @param {boolean} params.defaultValue - automatically assigned to value when the widget appears in a form
 * @param {object} params.config -
 * @param {string} params.config.label - label to use alongside the select input
 */

const viewModel = function (params) {
    params.configKeys = ['defaultValue' /*, 'trueLabel', 'falseLabel'*/];

    BooleanCheckboxWidgetViewModel.apply(this, [params]);
    var self = this;

    // In the graph designer config form, if defaultValue is null (stale DB record),
    // correct it to false so the next save persists the right value.
    if (self.configForm && self.defaultValue && self.defaultValue() === null) {
        self.defaultValue(false);
    }

    this.setValue = function (val) {
        if (ko.unwrap(self.disabled) === false) {
            if (val === self.value()) {
                self.value(null);
            } else {
                self.value(val);
            }
        }
    };

    this.displayValue = ko.computed(function () {
        if (this.value() === true) {
            return this.node.config.trueLabel;
        } /*if (this.value()===false)*/ else {
            return this.node.config.falseLabel;
        }
    }, self);

    this.setDefaultValue = function (val) {
        if (val === self.defaultValue()) {
            self.defaultValue(null);
        } else {
            self.defaultValue(val);
        }
    };

    // For a boolean checkbox, null defaultValue means false (unchecked = false, not null)
    var defaultValue = ko.unwrap(this.defaultValue);
    if (defaultValue === null || defaultValue === undefined) {
        defaultValue = false;
    }

    if (
        this.tile &&
        ko.unwrap(this.tile.tileid) === '' &&
        self.value() === null
    ) {
        this.value(defaultValue);
    }
};

export default ko.components.register('checkbox-boolean-widget', {
    viewModel: viewModel,
    template: checkboxBooleanWidgetTemplate,
});
