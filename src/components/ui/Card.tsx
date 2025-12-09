import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'neon';
}

export const Card = ({ className, variant = 'default', children, ...props }: CardProps) => {
    const rootClassName = `card card-${variant} ${className || ''}`;

    return (
        <div
            className={rootClassName}
            {...props}
        >
            {children}
        </div>
    );
};
