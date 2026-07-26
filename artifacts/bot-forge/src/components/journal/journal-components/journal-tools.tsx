import React from 'react';
import { CSSTransition } from 'react-transition-group';
import Download from '@/components/download';
import Text from '@/components/shared_ui/text';
import { LabelPairedBarsFilterCaptionFillIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import { TJournalToolsProps } from '../journal.types';
import FilterDialog from './filter-dialog';

const JournalTools = ({
    checked_filters,
    filters,
    filterMessage,
    is_filter_dialog_visible,
    toggleFilterDialog,
}: TJournalToolsProps) => {
    const toggle_ref = React.useRef<HTMLDivElement>(null);
    const filter_node_ref = React.useRef<HTMLDivElement>(null);

    return (
        <>
            <div className='journal-tools__container'>
                <Download tab='journal' />
                <div ref={toggle_ref} className='journal-tools__container-filter' onClick={toggleFilterDialog}>
                    <Text size='xs' className='journal-tools__container-filter--label'>
                        <Localize i18n_default_text='Filters' />
                    </Text>
                    <LabelPairedBarsFilterCaptionFillIcon height='16px' width='16px' fill='var(--text-general)' />
                </div>
            </div>
            <CSSTransition
                nodeRef={filter_node_ref}
                in={is_filter_dialog_visible}
                classNames={{
                    enter: 'filter-dialog--enter',
                    enterDone: 'filter-dialog--enter-done',
                    exit: 'filter-dialog--exit',
                }}
                timeout={150}
                unmountOnExit
            >
                {/* wrapper div required: CSSTransition nodeRef must point to a DOM element */}
                <div ref={filter_node_ref}>
                    <FilterDialog
                        toggle_ref={toggle_ref}
                        checked_filters={checked_filters}
                        filters={filters}
                        filterMessage={filterMessage}
                        is_filter_dialog_visible={is_filter_dialog_visible}
                        toggleFilterDialog={toggleFilterDialog}
                    />
                </div>
            </CSSTransition>
        </>
    );
};

export default JournalTools;
