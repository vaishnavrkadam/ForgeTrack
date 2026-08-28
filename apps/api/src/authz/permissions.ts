export enum OrgPermission {
  READ = 'org:read',
  UPDATE = 'org:update',
  DELETE = 'org:delete',
  INVITE = 'org:invite',
  PROJECT_CREATE = 'project:create',
}

export enum ProjectPermission {
  READ = 'project:read',
  UPDATE = 'project:update',
  DELETE = 'project:delete',
  MANAGE_MEMBERS = 'project:manage_members',
  ISSUE_CREATE = 'issue:create',
  ISSUE_READ = 'issue:read',
  ISSUE_UPDATE = 'issue:update',
  ISSUE_DELETE = 'issue:delete',
  ISSUE_TRANSITION = 'issue:transition',
  COMMENT_CREATE = 'comment:create',
  COMMENT_READ = 'comment:read',
  COMMENT_UPDATE = 'comment:update',
  COMMENT_DELETE = 'comment:delete',
}

export const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    OrgPermission.READ,
    OrgPermission.UPDATE,
    OrgPermission.DELETE,
    OrgPermission.INVITE,
    OrgPermission.PROJECT_CREATE,
  ],
  ADMIN: [
    OrgPermission.READ,
    OrgPermission.UPDATE,
    OrgPermission.INVITE,
    OrgPermission.PROJECT_CREATE,
  ],
  MEMBER: [OrgPermission.READ],
  GUEST: [OrgPermission.READ],
};

export const PROJECT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    ProjectPermission.READ,
    ProjectPermission.UPDATE,
    ProjectPermission.DELETE,
    ProjectPermission.MANAGE_MEMBERS,
    ProjectPermission.ISSUE_CREATE,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.ISSUE_UPDATE,
    ProjectPermission.ISSUE_DELETE,
    ProjectPermission.ISSUE_TRANSITION,
    ProjectPermission.COMMENT_CREATE,
    ProjectPermission.COMMENT_READ,
    ProjectPermission.COMMENT_UPDATE,
    ProjectPermission.COMMENT_DELETE,
  ],
  MAINTAINER: [
    ProjectPermission.READ,
    ProjectPermission.UPDATE,
    ProjectPermission.MANAGE_MEMBERS,
    ProjectPermission.ISSUE_CREATE,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.ISSUE_UPDATE,
    ProjectPermission.ISSUE_TRANSITION,
    ProjectPermission.COMMENT_CREATE,
    ProjectPermission.COMMENT_READ,
    ProjectPermission.COMMENT_UPDATE,
    ProjectPermission.COMMENT_DELETE,
  ],
  DEVELOPER: [
    ProjectPermission.READ,
    ProjectPermission.ISSUE_CREATE,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.ISSUE_UPDATE,
    ProjectPermission.ISSUE_TRANSITION,
    ProjectPermission.COMMENT_CREATE,
    ProjectPermission.COMMENT_READ,
    ProjectPermission.COMMENT_UPDATE,
  ],
  REPORTER: [
    ProjectPermission.READ,
    ProjectPermission.ISSUE_CREATE,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.COMMENT_CREATE,
    ProjectPermission.COMMENT_READ,
  ],
  VIEWER: [
    ProjectPermission.READ,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.COMMENT_READ,
  ],
  GUEST: [
    ProjectPermission.READ,
    ProjectPermission.ISSUE_READ,
    ProjectPermission.COMMENT_READ,
  ],
};
