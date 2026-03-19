import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../utils/cn';
import type { GitLabUser } from '../../types/gitlab';

interface UserAvatarProps {
  user: Pick<GitLabUser, 'id' | 'name' | 'username' | 'avatar_url'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  linkToProfile?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function UserAvatar({
  user,
  size = 'md',
  showTooltip = true,
  linkToProfile = false,
  className,
}: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={user.avatar_url} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const wrapped = linkToProfile ? (
    <Link to={`/profile/${user.username}`}>{avatar}</Link>
  ) : (
    avatar
  );

  if (!showTooltip) return wrapped;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs opacity-75">@{user.username}</p>
      </TooltipContent>
    </Tooltip>
  );
}
