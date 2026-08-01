import PropTypes from 'prop-types';
import { createElement } from 'react';
import { Card, CardContent } from './ui/card';

export default function MonumentStatCard({ label, value, icon, iconClassName, iconContainerClassName }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconContainerClassName}`}>
            {createElement(icon, { className: `w-4 h-4 ${iconClassName}` })}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

MonumentStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  iconClassName: PropTypes.string.isRequired,
  iconContainerClassName: PropTypes.string.isRequired,
};
