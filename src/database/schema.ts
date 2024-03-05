import {modelOptions, prop, PropType} from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: 'room'}})
export class RoomSchema {
  @prop({type: () => String, required: true})
  public HostWsId: string;

  @prop({required: true, type: () => Array<String>})
  public PlayerIds: Array<string>;

  @prop({type: () => String, required: true})
  public RoomState: string;
}

@modelOptions({ schemaOptions: { collection: 'quiz'}})
export class QuizSchema {
    @prop({required: true, type: () => String})
    public QuizName: string

    @prop({required: true, type: () => Array<String>}, PropType.ARRAY)
    public Questions: Array<string>;
}

@modelOptions({ schemaOptions: { collection: 'question'}})
export class QuestionSchema {
    @prop({type: () => String, required: true})
    public Question: string;

    @prop({type: () => String, required: true}, PropType.MAP)
    public PossibleAnswers: Map<string, string>;

    @prop({type: () => String, required: true})
    public CorrectAnswer: string;

    @prop({type: () => String, default: 'MCQ'})
    public QuestionType?: string;
}
