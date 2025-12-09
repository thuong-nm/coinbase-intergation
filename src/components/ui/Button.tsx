import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) => {
    const rootClassName = `btn btn-${variant} btn-${size} ${className || ''}`;

    return (
        <button
            className={rootClassName}
            {...props}
        />
    );
};
