import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_roles' })
export class UserRoleAssignment {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;
}
