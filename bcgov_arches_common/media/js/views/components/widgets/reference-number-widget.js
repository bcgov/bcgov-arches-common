import $ from 'jquery';
import ko from 'knockout';
import WidgetViewModel from 'viewmodels/widget';
import AlertViewModel from 'viewmodels/alert';
import arches from 'arches';
import referenceNumberWidgetTemplate from 'templates/views/components/widgets/reference-number-widget.htm';

const viewModel = function (params) {
    params.configKeys = [
        'width',
        'maxLength',
        'defaultValue',
        'uneditable',
        'prefix',
        'sequenceDigits',
    ];

    WidgetViewModel.apply(this, [params]);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    self.urls = arches.urls;

    this.disable = ko.computed(() => {
        return (
            ko.unwrap(self.disabled) ||
            ko.unwrap(self.uneditable) ||
            !!ko.unwrap(self.value)
        );
    }, self);

    self.placeholder = ko.computed(() => {
        const year = new Date().getFullYear();
        const abbr = ko.unwrap(self.prefix) || 'AAA';
        const digits = parseInt(ko.unwrap(self.sequenceDigits)) || 4;
        return `${abbr}-${year}-${'0'.repeat(digits)}`;
    });

    self.getReportNumber = function () {
        const abbr = ko.unwrap(self.widget.config.prefix);
        const digits =
            parseInt(ko.unwrap(self.widget.config.sequenceDigits)) || 4;
        const url = `${self.urls.get_next_reference_number(self.node.id)}?abbreviation=${abbr}&sequence_digits=${digits}`;
        self.form.loading(true);
        $.ajax({ url })
            .done(function (data) {
                self.form.loading(false);
                if (data.status === 'success') {
                    self.value(data.report_number);
                } else {
                    self.form.alert(
                        new AlertViewModel(
                            'ep-alert-red',
                            'Failed to generate reference number',
                            data.error_message || 'Please try again.',
                            null,
                            function () {},
                        ),
                    );
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                console.log(errorThrown);
                self.form.alert(
                    new AlertViewModel(
                        'ep-alert-red',
                        `Unable to get reference number: ${textStatus}`,
                        `Please check the browser console for details`,
                        null,
                        function () {},
                    ),
                );
                self.form.loading(false);
            });
    };
};

export default ko.components.register('reference-number-widget', {
    viewModel: viewModel,
    template: referenceNumberWidgetTemplate,
});
