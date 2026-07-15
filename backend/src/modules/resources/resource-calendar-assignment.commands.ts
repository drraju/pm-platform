export interface AssignCalendarCommand {
  calendarId: string;
  resourceId: string;
}

export interface ClearCalendarAssignmentCommand {
  resourceId: string;
}

export interface RetrieveCalendarAssignmentCommand {
  resourceId: string;
}
