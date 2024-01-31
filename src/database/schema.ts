import {modelOptions, prop, PropType} from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: 'room'}})
export class RoomSchema {
  @prop({type: () => String, required: true})
  public host_ws_id: string;

  @prop({required: true, type: () => Array<String>})
  public player_ids: Array<string>;

  @prop({type: () => String, required: true})
  public room_state: string;
}

@modelOptions({ schemaOptions: { collection: 'quiz'}})
export class QuizSchema {
    @prop({required: true, type: () => Array<String>}, PropType.ARRAY)
    public questions: Array<string>;
}

@modelOptions({ schemaOptions: { collection: 'question'}})
export class QuestionSchema {
    @prop({type: () => String, required: true})
    public question: string;

    @prop({type: () => String, required: true}, PropType.MAP)
    public possible_answers: Map<string, string>;

    @prop({type: () => String, required: true})
    public correct_answer: string;

    @prop({type: () => String, default: 'MCQ'})
    public question_type?: string;
}
