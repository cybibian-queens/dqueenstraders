import React from 'react';
import PropTypes from 'prop-types';
import ErrorComponent from './index';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    // React 19-compatible: use getDerivedStateFromError for state update
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        if (window.TrackJS) window.TrackJS.console.log(this.props.root_store);
        // Do NOT call setState here — getDerivedStateFromError handles state
        if (process.env.NODE_ENV !== 'production') {
            console.error('[ErrorBoundary]', error, info); // eslint-disable-line no-console
        }
    }

    render() {
        if (this.state.hasError) {
            return <ErrorComponent should_show_refresh={true} />;
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    root_store: PropTypes.object,
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};

export default ErrorBoundary;
